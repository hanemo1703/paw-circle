import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private messagesRepo: Repository<Message>) {}

  send(senderId: string, receiverId: string, content: string) {
    const message = this.messagesRepo.create({ senderId, receiverId, content });
    return this.messagesRepo.save(message);
  }

  // Get the full conversation between two users, ordered by time
  async conversation(userId: string, otherUserId: string) {
    return this.messagesRepo
      .createQueryBuilder('message')
      .where(
        '(message.senderId = :userId AND message.receiverId = :otherUserId) OR (message.senderId = :otherUserId AND message.receiverId = :userId)',
        { userId, otherUserId },
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }
}
