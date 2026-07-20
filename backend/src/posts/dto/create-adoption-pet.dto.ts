import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { PetGender, AdoptionPetInfo } from '../entities/post.entity';

export class CreateAdoptionPetDto implements AdoptionPetInfo {
  @IsString()
  @MaxLength(100)
  species: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsEnum(PetGender)
  gender?: PetGender;

  @IsOptional()
  @IsNumber()
  size?: number;
}
