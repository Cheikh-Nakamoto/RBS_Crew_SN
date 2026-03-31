import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;
    const where = search
      ? { filename: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findOne(id: string) {
    const item = await this.prisma.media.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Media not found');
    return item;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.media.delete({ where: { id } });
    return { message: 'Media deleted' };
  }
}
