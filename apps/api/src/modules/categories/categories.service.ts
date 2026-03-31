import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(locale: Locale) {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
        children: {
          include: { translations: { where: { locale: locale as PrismaLocale } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return categories;
  }

  async findBySlug(slug: string, locale: Locale) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
        children: { include: { translations: { where: { locale: locale as PrismaLocale } } } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        slug: dto.slug,
        parentId: dto.parentId,
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            name: t.name,
            description: t.description,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id },
      data: {
        slug: dto.slug,
        parentId: dto.parentId,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
