import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Donation } from './donation.entity';

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CampaignPosterType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATION = 'ORGANIZATION',
}

export enum CampaignCategory {
  FOOD_SUPPLIES = 'FOOD_SUPPLIES',
  MEDICAL = 'MEDICAL',
  OTHER = 'OTHER',
}

@Entity('donation_campaigns')
export class DonationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CampaignPosterType, default: CampaignPosterType.INDIVIDUAL })
  posterType: CampaignPosterType;

  @Column({ type: 'enum', enum: CampaignCategory, default: CampaignCategory.OTHER })
  category: CampaignCategory;

  @Column({ nullable: true })
  categoryOther?: string;

  @Column({ nullable: true })
  organizationLink?: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column({ type: 'float', nullable: true })
  targetAmount?: number;

  @Column({ type: 'float', default: 0 })
  currentAmount: number;

  @Column({ type: 'timestamptz', nullable: true })
  deadline?: Date;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountHolder?: string;

  @Column({ nullable: true })
  qrImageUrl?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  pickupAddress?: string;

  @Index()
  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @Index()
  @Column()
  creatorId: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  creator: User;

  @OneToMany(() => Donation, (donation) => donation.campaign)
  donations: Donation[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
