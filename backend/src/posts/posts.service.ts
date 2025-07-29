import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { AdoptionPetStatus, Post, PostStatus, PostType } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { forwardGeocode } from './geocoding.util';

// How many legacy posts get an approximate pin backfilled per map-view open —
// kept small since this runs sequentially through Nominatim's ~1 req/sec limit.
const MAX_GEOCODE_BACKFILL = 8;

// Strip fields the post detail page has no business exposing about the author
// (matches the author's own privacy toggles for phone/email visibility).
function sanitizePublicUser(user?: { password?: string; showPhonePublicly?: boolean; showEmailPublicly?: boolean; phone?: string; email?: string }) {
  if (!user) return;
  delete user.password;
  if (!user.showPhonePublicly) delete user.phone;
  if (!user.showEmailPublicly) delete user.email;
  delete user.showPhonePublicly;
  delete user.showEmailPublicly;
}

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private postsRepo: Repository<Post>) {}

  async create(authorId: string, dto: CreatePostDto) {
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

    // Pinning a location at creation is optional — best-effort fill an approximate
    // pin from the address text so posts still show up on the map view.
    if (post.address && (post.latitude == null || post.longitude == null)) {
      const geocoded = await forwardGeocode(post.address);
      if (geocoded) {
        post.latitude = geocoded.latitude;
        post.longitude = geocoded.longitude;
      }
    }

    return this.postsRepo.save(post);
  }

  async findAll(query: QueryPostDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 6;

    const qb = this.postsRepo.createQueryBuilder('post');

    if (query.type) {
      qb.andWhere('post.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('post.status = :status', { status: query.status });
    }
    if (query.authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId: query.authorId });
    }

    // Matches PostList.tsx's status chips, which pick specific (type, status) combos
    // rather than a plain status filter (e.g. "Đang tìm" only applies to LOST:OPEN).
    if (query.statusCombos) {
      const combos = query.statusCombos
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (combos.length > 0) {
        qb.andWhere(
          new Brackets((sub) => {
            combos.forEach((combo, i) => {
              const [comboType, comboStatus] = combo.split(':');
              if (!comboType || !comboStatus) return;
              sub.orWhere(`(post.type = :comboType${i} AND post.status = :comboStatus${i})`, {
                [`comboType${i}`]: comboType,
                [`comboStatus${i}`]: comboStatus,
              });
            });
          }),
        );
      }
    }

    if (query.species) {
      const species = query.species
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const namedSpecies = species.filter((s) => s !== 'OTHER');
      const includeOther = species.includes('OTHER');
      if (namedSpecies.length > 0 || includeOther) {
        qb.andWhere(
          new Brackets((sub) => {
            if (namedSpecies.length > 0) {
              sub.orWhere('post.species IN (:...namedSpecies)', { namedSpecies });
            }
            if (includeOther) {
              sub.orWhere('post.species NOT IN (:...nonOtherSpecies)', { nonOtherSpecies: ['Chó', 'Mèo'] });
            }
          }),
        );
      }
    }

    if (query.provinceCodes) {
      const provinceCodes = query.provinceCodes
        .split(',')
        .map((c) => Number(c.trim()))
        .filter((c) => !Number.isNaN(c));
      if (provinceCodes.length > 0) {
        qb.andWhere('post.provinceCode IN (:...provinceCodes)', { provinceCodes });
      }
    }

    if (query.search) {
      qb.andWhere('(post.title ILIKE :search OR post.address ILIKE :search)', { search: `%${query.search}%` });
    }

    qb.orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string) {
    const post = await this.postsRepo.findOne({ where: { id }, relations: ['author'] });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }
    sanitizePublicUser(post.author);
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

    if (post.address && (post.latitude == null || post.longitude == null)) {
      const geocoded = await forwardGeocode(post.address);
      if (geocoded) {
        post.latitude = geocoded.latitude;
        post.longitude = geocoded.longitude;
      }
    }

    return this.postsRepo.save(post);
  }

  // Best-effort backfill for legacy posts that only have a text address, called
  // from the map view (not findAll/findOne) so unrelated list-page loads never
  // pay for Nominatim round-trips.
  async geocodeMissing(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const posts = await this.postsRepo.find({ where: { id: In(ids) } });
    const candidates = posts.filter((p) => p.address && (p.latitude == null || p.longitude == null));
    const capped = candidates.slice(0, MAX_GEOCODE_BACKFILL);

    const resolved: { id: string; latitude: number; longitude: number }[] = [];
    for (const post of capped) {
      const geocoded = await forwardGeocode(post.address as string);
      if (!geocoded) continue;
      await this.postsRepo.update(post.id, geocoded);
      resolved.push({ id: post.id, ...geocoded });
    }
    return resolved;
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
