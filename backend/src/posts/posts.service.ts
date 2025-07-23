import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostType } from './entities/post.entity';
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
      ...(firstPet && {
        species: dto.species ?? firstPet.species,
        breed: dto.breed ?? firstPet.breed,
        color: dto.color ?? firstPet.color,
        size: dto.size ?? firstPet.size,
      }),
    });
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
