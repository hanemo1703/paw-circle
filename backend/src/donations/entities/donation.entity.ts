import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DonationCampaign } from './donation-campaign.entity';

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ default: false })
  anonymous: boolean;

  @Column()
  donorId: string;

  @ManyToOne(() => User, (user) => user.donations)
  donor: User;

  @Column()
  campaignId: string;

  @ManyToOne(() => DonationCampaign, (campaign) => campaign.donations)
  campaign: DonationCampaign;

  @CreateDateColumn()
  createdAt: Date;
}
