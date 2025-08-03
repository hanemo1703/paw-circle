import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
@Index(['receiverId', 'isRead'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Index()
  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.messagesSent)
  sender: User;

  @Index()
  @Column()
  receiverId: string;

  @ManyToOne(() => User, (user) => user.messagesReceived)
  receiver: User;

  @Column({ default: false })
  isRead: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
