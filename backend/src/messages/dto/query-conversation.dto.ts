import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryConversationDto {
  // ISO createdAt cursor — when set, fetches the batch immediately older than this.
  @IsOptional()
  @IsDateString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
