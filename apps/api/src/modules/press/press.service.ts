import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreatePressDto } from './dto/create-press.dto';

@Injectable()
export class PressService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { source: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.pressMention.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.pressMention.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findOne(id: string) {
    const item = await this.prisma.pressMention.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Press mention not found');
    return item;
  }

  async create(dto: CreatePressDto) {
    return this.prisma.pressMention.create({
      data: {
        title: dto.title,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        logoUrl: dto.logoUrl,
        excerpt: dto.excerpt,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async update(id: string, dto: Partial<CreatePressDto>) {
    await this.findOne(id);
    return this.prisma.pressMention.update({
      where: { id },
      data: {
        title: dto.title,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        logoUrl: dto.logoUrl,
        excerpt: dto.excerpt,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.pressMention.delete({ where: { id } });
    return { message: 'Press mention deleted' };
  }
}
