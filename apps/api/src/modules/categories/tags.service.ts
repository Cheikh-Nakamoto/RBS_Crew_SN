import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { CreateTagDto } from './dto/create-category.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(locale: Locale) {
    return this.prisma.tag.findMany({
      include: { translations: { where: { locale: locale as PrismaLocale } } },
      orderBy: { slug: 'asc' },
    });
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        slug: dto.slug,
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            name: t.name,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(id: string, dto: Partial<CreateTagDto>) {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tag not found');
    return this.prisma.tag.update({
      where: { id },
      data: {
        slug: dto.slug,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                name: t.name,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted' };
  }
}
