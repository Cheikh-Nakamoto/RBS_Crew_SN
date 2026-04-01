import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateArtistDto } from './dto/create-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(query: PaginationQueryDto, locale: Locale) {
    const cacheKey = `artists:${locale}:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        skip,
        take: limit,
        include: {
          translations: { where: { locale: locale as PrismaLocale } },
          featuredImage: true,
          avatar: true,
          artworks: {
            include: { media: true },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.artist.count(),
    ]);

    const result = paginate(artists, total, query);
    await this.cache.set(cacheKey, result);
    return result;
  }

  async findBySlug(slug: string, locale: Locale) {
    const artist = await this.prisma.artist.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
        featuredImage: true,
        avatar: true,
        artworks: {
          include: { media: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!artist) throw new NotFoundException('Artist not found');
    return artist;
  }

  async create(dto: CreateArtistDto) {
    const artist = await this.prisma.artist.create({
      data: {
        slug: dto.slug,
        featuredImageId: dto.featuredImageId,
        avatarId: dto.avatarId,
        city: dto.city,
        country: dto.country,
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            name: t.name,
            bio: t.bio,
          })),
        },
        artworks: dto.artworkIds
          ? {
              create: dto.artworkIds.map((mediaId, position) => ({ mediaId, position })),
            }
          : undefined,
      },
      include: { translations: true, avatar: true, artworks: { include: { media: true } } },
    });
    await this.clearCache();
    return artist;
  }

  async update(id: string, dto: Partial<CreateArtistDto>) {
    const existing = await this.prisma.artist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Artist not found');

    const artist = await this.prisma.artist.update({
      where: { id },
      data: {
        slug: dto.slug,
        featuredImageId: dto.featuredImageId,
        avatarId: dto.avatarId,
        city: dto.city,
        country: dto.country,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                name: t.name,
                bio: t.bio,
              })),
            }
          : undefined,
        artworks: dto.artworkIds
          ? {
              deleteMany: {},
              create: dto.artworkIds.map((mediaId, position) => ({ mediaId, position })),
            }
          : undefined,
      },
      include: { translations: true, avatar: true, artworks: { include: { media: true } } },
    });
    await this.clearCache();
    return artist;
  }

  async remove(id: string) {
    const existing = await this.prisma.artist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Artist not found');
    await this.prisma.artist.delete({ where: { id } });
    await this.clearCache();
    return { message: 'Artist deleted' };
  }

  private async clearCache() {
    await Promise.all(this.cache.stores.map((s) => s.clear()));
  }
}
