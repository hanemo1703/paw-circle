import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async findAll() {
    return this.usersRepo.find({
      select: ['id', 'name', 'email', 'role', 'isVerifiedOrg', 'avatarUrl', 'createdAt'],
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'role', 'isVerifiedOrg', 'avatarUrl', 'createdAt'],
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }
}
