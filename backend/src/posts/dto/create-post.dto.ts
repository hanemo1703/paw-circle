import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PetGender, PostType } from '../entities/post.entity';
import { CreateAdoptionPetDto } from './create-adoption-pet.dto';

export class CreatePostDto {
  @IsEnum(PostType)
  type: PostType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
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
  @IsInt()
  provinceCode?: number;

  @IsOptional()
  @IsInt()
  wardCode?: number;

  // VND has no subunit in everyday use, so prices are always whole đồng amounts.
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  petId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  size?: number;

  @IsOptional()
  @IsEnum(PetGender)
  gender?: PetGender;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  collarDescription?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateAdoptionPetDto)
  pets?: CreateAdoptionPetDto[];
}
