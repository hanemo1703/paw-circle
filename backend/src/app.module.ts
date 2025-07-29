import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/entities/user.entity';
import { Pet } from './pets/entities/pet.entity';
import { Post } from './posts/entities/post.entity';
import { DonationCampaign } from './donations/entities/donation-campaign.entity';
import { Donation } from './donations/entities/donation.entity';
import { Message } from './messages/entities/message.entity';
import { Notification } from './notifications/entities/notification.entity';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { PostsModule } from './posts/posts.module';
import { DonationsModule } from './donations/donations.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'petconnect'),
        password: config.get('DB_PASSWORD', 'petconnect'),
        database: config.get('DB_DATABASE', 'petconnect'),
        entities: [User, Pet, Post, DonationCampaign, Donation, Message, Notification],
        // Chi dung synchronize=true khi phat trien local. Khi len production
        // hay chuyen sang dung migration (yarn migration:run).
        synchronize: true,
        // Logs any query slower than this threshold via TypeORM's default logger,
        // so slow queries surface in the console instead of only being noticed in prod.
        maxQueryExecutionTime: config.get<number>('DB_SLOW_QUERY_MS', 200),
      }),
    }),
    AuthModule,
    UsersModule,
    PetsModule,
    PostsModule,
    DonationsModule,
    MessagesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
