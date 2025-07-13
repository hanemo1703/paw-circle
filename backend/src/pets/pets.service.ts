import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';

@Injectable()
export class PetsService {
  constructor(@InjectRepository(Pet) private petsRepo: Repository<Pet>) {}

  create(ownerId: string, dto: CreatePetDto) {
    const pet = this.petsRepo.create({ ...dto, ownerId });
    return this.petsRepo.save(pet);
  }

  findAllByOwner(ownerId: string) {
    return this.petsRepo.find({ where: { ownerId } });
  }

  async findOne(id: string) {
    const pet = await this.petsRepo.findOne({ where: { id } });
    if (!pet) {
      throw new NotFoundException('Không tìm thấy thú cưng');
    }
    return pet;
  }
}
