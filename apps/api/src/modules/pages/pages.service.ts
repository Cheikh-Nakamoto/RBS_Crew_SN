import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Locale as PrismaLocale, ProductStatus } from '@prisma/client';

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(query: PaginationQueryDto, locale: string) {
    const cacheKey = `pages:${locale}:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      this.prisma.page.findMany({
        skip,
        take: limit,
        where: { status: 'PUBLISHED' },
        include: {
          translations: { where: { locale: locale as PrismaLocale } },
          children: {
            where: { status: 'PUBLISHED' },
            include: { translations: { where: { locale: locale as PrismaLocale } } },
          },
        },
        orderBy: { menuOrder: 'asc' },
      }),
      this.prisma.page.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const result = paginate(pages, total, query);
    await this.cache.set(cacheKey, result);
    return result;
  }

  async findBySlug(slug: string, locale: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
        children: {
          where: { status: 'PUBLISHED' },
          include: { translations: { where: { locale: locale as PrismaLocale } } },
        },
      },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto) {
    const page = await this.prisma.page.create({
      data: {
        slug: dto.slug,
        template: dto.template,
        parentId: dto.parentId,
        menuOrder: dto.menuOrder,
        status: (dto.status as ProductStatus) || 'PUBLISHED',
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            title: t.title,
            slug: t.slug,
            content: t.content,
            excerpt: t.excerpt,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
          })),
        },
      },
      include: { translations: true },
    });
    await this.clearCache();
    return page;
  }

  async update(id: string, dto: UpdatePageDto) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        slug: dto.slug,
        template: dto.template,
        parentId: dto.parentId,
        menuOrder: dto.menuOrder,
        status: (dto.status as ProductStatus) || undefined,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                title: t.title,
                slug: t.slug,
                content: t.content,
                excerpt: t.excerpt,
                metaTitle: t.metaTitle,
                metaDescription: t.metaDescription,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
    await this.clearCache();
    return page;
  }

  async remove(id: string) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');
    await this.prisma.page.delete({ where: { id } });
    await this.clearCache();
    return { message: 'Page deleted' };
  }

  private async clearCache() {
    await Promise.all(this.cache.stores.map((s) => s.clear()));
  }
}
