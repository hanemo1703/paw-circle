import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  images?: string[];

  @IsNumber()
  @Min(1)
  targetAmount: number;
}
