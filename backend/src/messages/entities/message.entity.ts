import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.messagesSent)
  sender: User;

  @Column()
  receiverId: string;

  @ManyToOne(() => User, (user) => user.messagesReceived)
  receiver: User;

  @CreateDateColumn()
  createdAt: Date;
}
