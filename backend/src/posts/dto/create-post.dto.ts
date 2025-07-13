import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PostType } from '../entities/post.entity';

export class CreatePostDto {
  @IsEnum(PostType)
  type: PostType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  images?: string[];

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  petId?: string;
}
