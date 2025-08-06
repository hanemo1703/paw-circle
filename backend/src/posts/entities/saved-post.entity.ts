import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// Plain join rows (userId, postId) rather than entity relations — this table is only
// ever queried directly (save/unsave/exists-check, or joined into Post.findAll's query
// builder for the "saved by me" filter), never needs to be eager-loaded onto a Post/User.
@Entity('saved_posts')
@Index(['userId', 'postId'], { unique: true })
export class SavedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Real `uuid` columns (not the default varchar) — compared directly against
  // Post.id/User.id (both `uuid`-typed) in posts.service.ts's join; Postgres has
  // no varchar = uuid operator between two typed columns, only a coercible literal.
  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column('uuid')
  postId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
