import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PostStatus, PostType } from '../entities/post.entity';

export class QueryPostDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
