import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PetSpecies } from '../entities/pet.entity';

export class CreatePetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(PetSpecies)
  species: PetSpecies;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  microchipId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
