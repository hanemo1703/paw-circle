import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_AVATAR_SIZE_BYTES, userAvatarStorage } from './avatar-upload.config';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: userAvatarStorage }))
  uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AVATAR_SIZE_BYTES, message: 'Ảnh đại diện tối đa 5MB.' }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return { url: `/uploads/avatars/${file.filename}` };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa hồ sơ này');
    }
    return this.usersService.update(id, dto);
  }
}
