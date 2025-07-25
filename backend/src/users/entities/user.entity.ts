import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Pet, (pet) => pet.owner)
  pets: Pet[];

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
