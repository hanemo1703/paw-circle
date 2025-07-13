import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Pet } from '../../pets/entities/pet.entity';

export enum PostType {
  LOST = 'LOST',
  FOUND = 'FOUND',
  ADOPTION = 'ADOPTION',
  MARKETPLACE = 'MARKETPLACE',
}

export enum PostStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PostType })
  type: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.OPEN })
  status: PostStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column({ type: 'float', nullable: true })
  latitude?: number;

  @Column({ type: 'float', nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'float', nullable: true })
  price?: number;

  @Column()
  authorId: string;

  @ManyToOne(() => User, (user) => user.posts)
  author: User;

  @Column({ nullable: true })
  petId?: string;

  @ManyToOne(() => Pet, (pet) => pet.posts, { nullable: true })
  pet?: Pet;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
