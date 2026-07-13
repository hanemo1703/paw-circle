import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';

export enum PetSpecies {
  DOG = 'DOG',
  CAT = 'CAT',
  OTHER = 'OTHER',
}

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'enum', enum: PetSpecies })
  species: PetSpecies;

  @Column({ nullable: true })
  breed?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  microchipId?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.pets)
  owner: User;

  @OneToMany(() => Post, (post) => post.pet)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;
}
