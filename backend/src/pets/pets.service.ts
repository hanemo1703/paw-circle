import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { QueryPetDto } from './dto/query-pet.dto';

@Injectable()
export class PetsService {
  constructor(@InjectRepository(Pet) private petsRepo: Repository<Pet>) {}

  create(ownerId: string, dto: CreatePetDto) {
    const pet = this.petsRepo.create({ ...dto, ownerId });
    return this.petsRepo.save(pet);
  }

  async findAllByOwner(ownerId: string, query: QueryPetDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const [data, total] = await this.petsRepo.findAndCount({
      where: { ownerId },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string) {
    const pet = await this.petsRepo.findOne({ where: { id } });
    if (!pet) {
      throw new NotFoundException('Không tìm thấy thú cưng');
    }
    return pet;
  }
}
