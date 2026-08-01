import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus, PostType } from '../entities/post.entity';

export class QueryPostDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  // Comma-separated "TYPE:STATUS" pairs, e.g. "LOST:OPEN,ADOPTION:OPEN" — matches
  // PostList.tsx's multi-select status chips, which group by (type, status) combo.
  @IsOptional()
  @IsString()
  statusCombos?: string;

  // Comma-separated species values; "OTHER" means "not Chó and not Mèo".
  @IsOptional()
  @IsString()
  species?: string;

  // Comma-separated provinces.open-api.vn codes.
  @IsOptional()
  @IsString()
  provinceCodes?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Hard-capped at 500 so map view (which needs "all matching" pins, not just
  // one page) still can't turn this into an unbounded query.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 6;
}
