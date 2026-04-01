import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';

const productInclude = (locale: PrismaLocale) => ({
  translations: { where: { locale } },
  featuredImage: true,
  images: { orderBy: { position: 'asc' as const }, include: { media: true } },
  categories: { include: { category: { include: { translations: { where: { locale } } } } } },
  tags: { include: { tag: { include: { translations: { where: { locale } } } } } },
});

function mapProduct(product: any) {
  return {
    ...product,
    images: product.images.map((pi: any) => pi.media),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(filter: ProductFilterDto, locale: Locale) {
    const prismaLocale = locale as PrismaLocale;
    const cacheKey = `products:${locale}:${JSON.stringify(filter)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 20, search, categorySlug, tagSlug, minPrice, maxPrice, status, order } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: status ?? 'PUBLISHED',
    };

    if (search) {
      where['translations'] = {
        some: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }
    if (categorySlug) {
      where['categories'] = { some: { category: { slug: categorySlug } } };
    }
    if (tagSlug) {
      where['tags'] = { some: { tag: { slug: tagSlug } } };
    }
    if (minPrice !== undefined) {
      where['price'] = { ...(where['price'] as object ?? {}), gte: minPrice };
    }
    if (maxPrice !== undefined) {
      where['price'] = { ...(where['price'] as object ?? {}), lte: maxPrice };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: productInclude(prismaLocale),
        orderBy: { createdAt: order === 'asc' ? 'asc' : 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = paginate(products.map(mapProduct), total, filter);
    await this.cache.set(cacheKey, result);
    return result;
  }

  async findBySlug(slug: string, locale: Locale) {
    const prismaLocale = locale as PrismaLocale;
    const translation = await this.prisma.productTranslation.findFirst({
      where: { slug, locale: prismaLocale },
      include: {
        product: {
          include: productInclude(prismaLocale),
        },
      },
    });
    if (!translation) throw new NotFoundException('Product not found');
    return mapProduct(translation.product);
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        slug: dto.slug,
        sku: dto.sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock ?? 0,
        status: (dto.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') ?? 'DRAFT',
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            name: t.name,
            slug: t.slug,
            description: t.description,
            shortDescription: t.shortDescription,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
          })),
        },
        categories: dto.categoryIds
          ? { create: dto.categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
        tags: dto.tagIds
          ? { create: dto.tagIds.map((id) => ({ tagId: id })) }
          : undefined,
      },
      include: { translations: true },
    });
    await this.clearCache();
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock,
        status: dto.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                name: t.name,
                slug: t.slug,
                description: t.description,
                shortDescription: t.shortDescription,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
    await this.clearCache();
    return product;
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    await this.clearCache();
    return { message: 'Product deleted' };
  }

  async getVariants(productId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.productVariant.findMany({ where: { productId } });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        price: dto.price,
        stock: dto.stock ?? 0,
        options: dto.attributes ?? {},
      },
    });
  }

  private async clearCache() {
    await Promise.all(this.cache.stores.map((s) => s.clear()));
  }
}
