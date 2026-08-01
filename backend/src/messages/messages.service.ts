import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { MessagesGateway } from './messages.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

interface InboxRow {
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  sender_id: string;
  sender_name: string;
  sender_avatar_url: string | null;
  receiver_id: string;
  receiver_name: string;
  receiver_avatar_url: string | null;
  total_count: string;
}

const MESSAGE_SELECT = [
  'message.id',
  'message.content',
  'message.senderId',
  'message.receiverId',
  'message.isRead',
  'message.createdAt',
  'sender.id',
  'sender.name',
  'sender.avatarUrl',
  'receiver.id',
  'receiver.name',
  'receiver.avatarUrl',
];

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private messagesRepo: Repository<Message>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    private messagesGateway: MessagesGateway,
    private notificationsService: NotificationsService,
  ) {}

  async send(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Không thể tự gửi tin nhắn cho chính mình');
    }
    const receiverExists = await this.usersRepo.exists({ where: { id: receiverId } });
    if (!receiverExists) {
      throw new NotFoundException('Không tìm thấy người nhận');
    }

    const message = this.messagesRepo.create({ senderId, receiverId, content });
    await this.messagesRepo.save(message);

    const fullMessage = await this.messagesRepo
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .select(MESSAGE_SELECT)
      .where('message.id = :id', { id: message.id })
      .getOne();

    this.messagesGateway.notifyNewMessage(receiverId, fullMessage);

    const notification = await this.notificationsService.create(
      receiverId,
      NotificationType.MESSAGE,
      `${fullMessage?.sender?.name ?? 'Người dùng'} đã gửi cho bạn một tin nhắn mới`,
      `/messages/${senderId}`,
    );
    this.messagesGateway.notifyNotification(receiverId, notification);

    return fullMessage;
  }

  // Keyset-paginated conversation between two users — the most recent `limit` messages
  // by default, or the batch immediately before `before` when scrolling up for history.
  // Returned oldest-first (render order) regardless of which page was fetched.
  async conversation(userId: string, otherUserId: string, before?: string, limit = 50) {
    const qb = this.messagesRepo
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .select(MESSAGE_SELECT)
      .where(
        '(message.senderId = :userId AND message.receiverId = :otherUserId) OR (message.senderId = :otherUserId AND message.receiverId = :userId)',
        { userId, otherUserId },
      );

    if (before) {
      qb.andWhere('message.createdAt < :before', { before });
    }

    qb.orderBy('message.createdAt', 'DESC').take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).reverse();

    return { data, hasMore };
  }

  // One row per counterpart (latest message only), with unread count — built via
  // DISTINCT ON in SQL instead of grouping the full message history in app code,
  // since a user's inbox otherwise grows unbounded with their total message count.
  async inbox(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Total conversation count is folded in via COUNT(*) OVER() instead of a separate
    // query — window functions are evaluated before LIMIT/OFFSET, so it still reflects
    // the full DISTINCT ON result set, not just the returned page.
    const rows: InboxRow[] = await this.messagesRepo.query(
      `
      SELECT
        m.content, m."senderId", m."receiverId", m."createdAt",
        s.id AS sender_id, s.name AS sender_name, s."avatarUrl" AS sender_avatar_url,
        r.id AS receiver_id, r.name AS receiver_name, r."avatarUrl" AS receiver_avatar_url,
        COUNT(*) OVER() AS total_count
      FROM (
        SELECT DISTINCT ON (counterpart_id) *,
          CASE WHEN "senderId" = $1 THEN "receiverId" ELSE "senderId" END AS counterpart_id
        FROM messages
        WHERE "senderId" = $1 OR "receiverId" = $1
        ORDER BY counterpart_id, "createdAt" DESC
      ) m
      JOIN users s ON s.id = m."senderId"
      JOIN users r ON r.id = m."receiverId"
      ORDER BY m."createdAt" DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );

    // Unread counts span the whole conversation history (not just the latest message),
    // but are grouped by counterpart — bounded by how many people messaged this user,
    // not by total message count.
    const unreadRows: { senderId: string; count: string }[] = await this.messagesRepo.query(
      `SELECT "senderId", COUNT(*) AS count FROM messages WHERE "receiverId" = $1 AND "isRead" = false GROUP BY "senderId"`,
      [userId],
    );
    const unreadByCounterpart = new Map(unreadRows.map((r) => [r.senderId, Number(r.count)]));

    const data = rows.map((row) => {
      const isIncoming = row.receiverId === userId;
      const otherUserId = isIncoming ? row.senderId : row.receiverId;
      return {
        otherUser: isIncoming
          ? { id: row.sender_id, name: row.sender_name, avatarUrl: row.sender_avatar_url ?? undefined }
          : { id: row.receiver_id, name: row.receiver_name, avatarUrl: row.receiver_avatar_url ?? undefined },
        lastMessage: {
          content: row.content,
          createdAt: row.createdAt,
          senderId: row.senderId,
        },
        unreadCount: unreadByCounterpart.get(otherUserId) ?? 0,
      };
    });

    return { data, total: rows.length > 0 ? Number(rows[0].total_count) : 0 };
  }

  unreadCount(userId: string) {
    return this.messagesRepo.count({ where: { receiverId: userId, isRead: false } });
  }

  async markRead(userId: string, otherUserId: string) {
    await this.messagesRepo.update(
      { receiverId: userId, senderId: otherUserId, isRead: false },
      { isRead: true },
    );
    this.messagesGateway.notifyRead(userId, otherUserId);
    return { success: true };
  }
}
