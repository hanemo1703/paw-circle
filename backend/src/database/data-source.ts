import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { DonationCampaign } from '../donations/entities/donation-campaign.entity';
import { Donation } from '../donations/entities/donation.entity';
import { Message } from '../messages/entities/message.entity';
import { Notification } from '../notifications/entities/notification.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'petconnect',
  password: process.env.DB_PASSWORD || 'petconnect',
  database: process.env.DB_DATABASE || 'petconnect',
  entities: [User, Post, DonationCampaign, Donation, Message, Notification],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
