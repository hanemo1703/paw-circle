import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { MessagesGateway } from './messages.gateway';

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
    return fullMessage;
  }

  // Get the full conversation between two users, ordered by time
  async conversation(userId: string, otherUserId: string) {
    return this.messagesRepo
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .select(MESSAGE_SELECT)
      .where(
        '(message.senderId = :userId AND message.receiverId = :otherUserId) OR (message.senderId = :otherUserId AND message.receiverId = :userId)',
        { userId, otherUserId },
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }

  // One row per counterpart, latest message first, with unread count
  async inbox(userId: string) {
    const messages = await this.messagesRepo
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .select(MESSAGE_SELECT)
      .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    const conversations: {
      otherUser: { id: string; name: string; avatarUrl?: string };
      lastMessage: { content: string; createdAt: Date; senderId: string };
      unreadCount: number;
    }[] = [];
    const indexByOtherUserId = new Map<string, number>();

    for (const message of messages) {
      const isIncoming = message.receiverId === userId;
      const otherUser = isIncoming ? message.sender : message.receiver;

      let index = indexByOtherUserId.get(otherUser.id);
      if (index === undefined) {
        index = conversations.length;
        indexByOtherUserId.set(otherUser.id, index);
        conversations.push({
          otherUser: { id: otherUser.id, name: otherUser.name, avatarUrl: otherUser.avatarUrl },
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
          },
          unreadCount: 0,
        });
      }
      if (isIncoming && !message.isRead) {
        conversations[index].unreadCount += 1;
      }
    }

    return conversations;
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
