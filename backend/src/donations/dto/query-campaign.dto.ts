import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCampaignDto {
  // Comma-separated CampaignStatus values.
  @IsOptional()
  @IsString()
  status?: string;

  // Comma-separated CampaignCategory values.
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'deadline', 'progress'])
  sort?: 'newest' | 'deadline' | 'progress';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 6;
}
