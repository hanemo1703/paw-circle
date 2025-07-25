import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Either an absolute URL (e.g. from Google/Facebook OAuth) or a relative
  // path returned by POST /users/avatar (e.g. "/uploads/avatars/xxx.jpg") —
  // not user-typed free text, so a loose string check is enough here.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  showPhonePublicly?: boolean;

  @IsOptional()
  @IsBoolean()
  showEmailPublicly?: boolean;
}
