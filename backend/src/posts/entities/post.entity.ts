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
  TRADE = 'TRADE',
}

export enum PostStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum PetGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

export enum AdoptionPetStatus {
  PENDING = 'PENDING',
  ADOPTED = 'ADOPTED',
}

// One row per animal for ADOPTION posts covering more than one pet (e.g. a litter)
export interface AdoptionPetInfo {
  species: string;
  breed?: string;
  color?: string;
  age?: number;
  gender?: PetGender;
  size?: number;
  status?: AdoptionPetStatus;
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

  @Column({ nullable: true })
  species?: string;

  @Column({ nullable: true })
  breed?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ type: 'float', nullable: true })
  size?: number;

  @Column({ type: 'enum', enum: PetGender, nullable: true })
  gender?: PetGender;

  @Column({ nullable: true })
  collarDescription?: string;

  @Column({ type: 'jsonb', nullable: true })
  pets?: AdoptionPetInfo[];

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
