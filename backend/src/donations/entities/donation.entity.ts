import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
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

  // Nullable at the DB level so pre-existing rows created before this column
  // existed don't break `synchronize`; the API still requires it for new donations.
  @Column({ nullable: true })
  proofImageUrl?: string;

  @Index()
  @Column()
  donorId: string;

  @ManyToOne(() => User, (user) => user.donations)
  donor: User;

  @Index()
  @Column()
  campaignId: string;

  @ManyToOne(() => DonationCampaign, (campaign) => campaign.donations, { onDelete: 'CASCADE' })
  campaign: DonationCampaign;

  @CreateDateColumn()
  createdAt: Date;
}
