import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale as PrismaLocale } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Locale } from '@rbs/types';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto, locale: Locale) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        skip,
        take: limit,
        include: {
          translations: { where: { locale: locale as PrismaLocale } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count(),
    ]);
    return paginate(projects, total, query);
  }

  async findBySlug(slug: string, locale: Locale) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: locale as PrismaLocale } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        slug: dto.slug,
        featuredImageUrl: dto.featuredImageUrl,
        clientName: dto.clientName,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        translations: {
          create: Object.entries(dto.translations).map(([locale, t]) => ({
            locale: locale as PrismaLocale,
            title: t.title,
            summary: t.summary,
            content: t.content,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: {
        slug: dto.slug,
        featuredImageUrl: dto.featuredImageUrl,
        clientName: dto.clientName,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        translations: dto.translations
          ? {
              deleteMany: {},
              create: Object.entries(dto.translations).map(([locale, t]) => ({
                locale: locale as PrismaLocale,
                title: t.title,
                summary: t.summary,
                content: t.content,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }
}
