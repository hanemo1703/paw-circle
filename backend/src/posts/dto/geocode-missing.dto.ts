import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class GeocodeMissingDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  ids: string[];
}
