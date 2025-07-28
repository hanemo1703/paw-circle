import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdoptionPetStatus, PetGender, AdoptionPetInfo } from '../entities/post.entity';

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
  @IsNumber({ maxDecimalPlaces: 1 })
  size?: number;

  // Not settable at creation (always starts PENDING) — accepted here so update
  // payloads can round-trip each pet's current adoption status unchanged.
  @IsOptional()
  @IsEnum(AdoptionPetStatus)
  status?: AdoptionPetStatus;
}
