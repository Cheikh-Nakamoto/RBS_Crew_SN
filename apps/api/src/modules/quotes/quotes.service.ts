import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
    return this.prisma.quote.create({
      data: {
        name: dto.name,
        surname: dto.surname,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        orderType: dto.orderType,
        quantity: dto.quantity,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        message: dto.message,
        status: 'NEW',
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count(),
    ]);
    return paginate(quotes, total, query);
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto) {
    await this.findOne(id);
    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
