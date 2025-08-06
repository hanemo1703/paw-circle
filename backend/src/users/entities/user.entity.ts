import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { DonationCampaign } from '../../donations/entities/donation-campaign.entity';
import { Donation } from '../../donations/entities/donation.entity';
import { Message } from '../../messages/entities/message.entity';

export enum UserRole {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ unique: true, nullable: true })
  googleId?: string;

  @Column({ unique: true, nullable: true })
  facebookId?: string;

  @Column({ type: 'varchar', default: 'local' })
  provider: 'local' | 'google' | 'facebook';

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isVerifiedOrg: boolean;

  @Column({ default: true })
  showPhonePublicly: boolean;

  @Column({ default: false })
  showEmailPublicly: boolean;

  // Single-use, short-lived token for the forgot-password flow (cleared on successful reset).
  @Column({ type: 'varchar', nullable: true, unique: true })
  resetPasswordToken?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpires?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => DonationCampaign, (campaign) => campaign.creator)
  campaigns: DonationCampaign[];

  @OneToMany(() => Donation, (donation) => donation.donor)
  donations: Donation[];

  @OneToMany(() => Message, (message) => message.sender)
  messagesSent: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  messagesReceived: Message[];
}
