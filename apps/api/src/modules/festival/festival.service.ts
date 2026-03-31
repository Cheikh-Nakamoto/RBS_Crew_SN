import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { CreateFestivalDto } from './dto/create-festival.dto';

@Injectable()
export class FestivalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(locale: Locale) {
    return this.prisma.festivalEdition.findMany({
      include: { translations: { where: { locale: locale as PrismaLocale } } },
      orderBy: { year: 'desc' },
    });
  }

  async findBySlug(slug: string, locale: Locale) {
    const edition = await this.prisma.festivalEdition.findUnique({
      where: { slug },
      include: { translations: { where: { locale: locale as PrismaLocale } } },
    });
    if (!edition) throw new NotFoundException('Festival edition not found');
    return edition;
  }

  async create(dto: CreateFestivalDto) {
    return this.prisma.festivalEdition.create({
      data: {
        slug: dto.slug,
        editionNumber: dto.editionNumber,
        year: dto.year,
        city: dto.city,
        country: dto.country ?? 'SN',
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            themeName: t.themeName,
            summary: t.summary,
            content: t.content,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(id: string, dto: Partial<CreateFestivalDto>) {
    const existing = await this.prisma.festivalEdition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Festival edition not found');
    return this.prisma.festivalEdition.update({
      where: { id },
      data: {
        slug: dto.slug,
        editionNumber: dto.editionNumber,
        year: dto.year,
        city: dto.city,
        country: dto.country,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                themeName: t.themeName,
                summary: t.summary,
                content: t.content,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
  }
}
