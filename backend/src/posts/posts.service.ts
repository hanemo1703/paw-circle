import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdoptionPetStatus, Post, PostStatus, PostType } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private postsRepo: Repository<Post>) {}

  create(authorId: string, dto: CreatePostDto) {
    // For multi-pet ADOPTION posts, backfill the scalar species/breed/... fields from
    // the first pet so anything still reading those columns gets sensible data
    // (same convention as images[0] acting as the implicit thumbnail).
    const firstPet = dto.type === PostType.ADOPTION ? dto.pets?.[0] : undefined;
    const post = this.postsRepo.create({
      ...dto,
      authorId,
      images: dto.images ?? [],
      // Every pet starts out up for adoption regardless of what the client sends.
      ...(dto.type === PostType.ADOPTION &&
        dto.pets && {
          pets: dto.pets.map((pet) => ({ ...pet, status: AdoptionPetStatus.PENDING })),
        }),
      ...(firstPet && {
        species: dto.species ?? firstPet.species,
        breed: dto.breed ?? firstPet.breed,
        color: dto.color ?? firstPet.color,
        size: dto.size ?? firstPet.size,
      }),
    });
    return this.postsRepo.save(post);
  }

  findAll(query: QueryPostDto) {
    return this.postsRepo.find({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.authorId ? { authorId: query.authorId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const post = await this.postsRepo.findOne({ where: { id }, relations: ['author'] });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }
    if (post.author) {
      delete (post.author as any).password;
      if (!post.author.showPhonePublicly) delete (post.author as any).phone;
      if (!post.author.showEmailPublicly) delete (post.author as any).email;
      delete (post.author as any).showPhonePublicly;
      delete (post.author as any).showEmailPublicly;
    }
    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài đăng này');
    }

    const firstPet = post.type === PostType.ADOPTION ? dto.pets?.[0] : undefined;
    Object.assign(post, {
      ...dto,
      // Newly added pets (no status yet, e.g. appended via the edit form) start PENDING;
      // existing pets keep whatever status the client echoed back.
      ...(post.type === PostType.ADOPTION &&
        dto.pets && {
          pets: dto.pets.map((pet) => ({ status: AdoptionPetStatus.PENDING, ...pet })),
        }),
      ...(firstPet && {
        species: dto.species ?? firstPet.species,
        breed: dto.breed ?? firstPet.breed,
        color: dto.color ?? firstPet.color,
        size: dto.size ?? firstPet.size,
      }),
    });

    // Whenever the pet list itself is part of this update, keep the post's own status in
    // sync: resolved once every pet has found a home, reopened if any pet still hasn't.
    if (post.type === PostType.ADOPTION && dto.pets && post.pets && post.pets.length > 0) {
      const allAdopted = post.pets.every((pet) => pet.status === AdoptionPetStatus.ADOPTED);
      post.status = allAdopted ? PostStatus.RESOLVED : PostStatus.OPEN;
    }

    return this.postsRepo.save(post);
  }

  async remove(id: string, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài đăng này');
    }
    await this.postsRepo.remove(post);
  }
}
