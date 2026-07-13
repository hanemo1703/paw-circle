import { IsEnum, IsOptional } from 'class-validator';
import { PostStatus, PostType } from '../entities/post.entity';

export class QueryPostDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
