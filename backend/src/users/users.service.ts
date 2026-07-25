import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async findAll() {
    return this.usersRepo.find({
      select: ['id', 'name', 'email', 'role', 'isVerifiedOrg', 'avatarUrl', 'createdAt'],
    });
  }

  // Full record for internal/owner use (e.g. update()'s return value) — never
  // privacy-filtered, since it's only ever handed back to the record's own owner.
  async findOne(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'phone',
        'role',
        'isVerifiedOrg',
        'avatarUrl',
        'showPhonePublicly',
        'showEmailPublicly',
        'createdAt',
      ],
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  async findPublicProfile(id: string) {
    const user = await this.findOne(id);
    const { showPhonePublicly, showEmailPublicly, ...rest } = user;
    return {
      ...rest,
      phone: showPhonePublicly ? user.phone : undefined,
      email: showEmailPublicly ? user.email : undefined,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    Object.assign(user, dto);
    await this.usersRepo.save(user);
    return this.findOne(id);
  }
}
