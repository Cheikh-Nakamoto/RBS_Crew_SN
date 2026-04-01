import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Locale as PrismaLocale, ProductStatus } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(query: PaginationQueryDto, locale: string) {
    const cacheKey = `services:${locale}:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        skip,
        take: limit,
        where: { status: 'PUBLISHED' },
        include: {
          translations: { where: { locale: locale as PrismaLocale } },
        },
        orderBy: { menuOrder: 'asc' },
      }),
      this.prisma.service.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const result = paginate(services, total, query);
    await this.cache.set(cacheKey, result);
    return result;
  }

  async findBySlug(slug: string, locale: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        slug: dto.slug,
        icon: dto.icon,
        menuOrder: dto.menuOrder,
        status: (dto.status as ProductStatus) || 'PUBLISHED',
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            title: t.title,
            description: t.description,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
          })),
        },
      },
      include: { translations: true },
    });
    await this.clearCache();
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');

    const service = await this.prisma.service.update({
      where: { id },
      data: {
        slug: dto.slug,
        icon: dto.icon,
        menuOrder: dto.menuOrder,
        status: (dto.status as ProductStatus) || undefined,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                title: t.title,
                description: t.description,
                metaTitle: t.metaTitle,
                metaDescription: t.metaDescription,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
    await this.clearCache();
    return service;
  }

  async remove(id: string) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    await this.prisma.service.delete({ where: { id } });
    await this.clearCache();
    return { message: 'Service deleted' };
  }

  private async clearCache() {
    await Promise.all(this.cache.stores.map((s) => s.clear()));
  }
}
