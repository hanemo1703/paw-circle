import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { CampaignCategory, CampaignPosterType, CampaignStatus } from '../entities/donation-campaign.entity';

export class UpdateCampaignDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsEnum(CampaignPosterType)
  posterType?: CampaignPosterType;

  @IsOptional()
  @IsEnum(CampaignCategory)
  category?: CampaignCategory;

  @ValidateIf((dto) => dto.category === CampaignCategory.OTHER)
  @IsString()
  categoryOther?: string;

  @ValidateIf((dto) => dto.posterType === CampaignPosterType.ORGANIZATION)
  @IsString()
  organizationLink?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1000)
  targetAmount?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  qrImageUrl?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  pickupAddress?: string;
}
