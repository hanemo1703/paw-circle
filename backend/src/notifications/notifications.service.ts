import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private notificationsRepo: Repository<Notification>) {}

  create(recipientId: string, type: NotificationType, content: string, link?: string) {
    const notification = this.notificationsRepo.create({ recipientId, type, content, link });
    return this.notificationsRepo.save(notification);
  }

  list(recipientId: string) {
    return this.notificationsRepo.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(recipientId: string, id: string) {
    await this.notificationsRepo.update({ id, recipientId }, { isRead: true });
    return { success: true };
  }

  async markAllRead(recipientId: string) {
    await this.notificationsRepo.update({ recipientId, isRead: false }, { isRead: true });
    return { success: true };
  }
}
