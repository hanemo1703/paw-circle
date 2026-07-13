import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Pet } from '../pets/entities/pet.entity';
import { Post } from '../posts/entities/post.entity';
import { DonationCampaign } from '../donations/entities/donation-campaign.entity';
import { Donation } from '../donations/entities/donation.entity';
import { Message } from '../messages/entities/message.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'petconnect',
  password: process.env.DB_PASSWORD || 'petconnect',
  database: process.env.DB_DATABASE || 'petconnect',
  entities: [User, Pet, Post, DonationCampaign, Donation, Message],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
