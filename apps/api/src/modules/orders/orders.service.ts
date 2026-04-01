import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

function generateOrderNumber(): string {
  return `RBS-${Date.now().toString(36).toUpperCase()}`;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, userId?: string) {
    if (!userId && !dto.guestEmail) {
      throw new BadRequestException('guestEmail is required for guest orders');
    }

    return this.prisma.$transaction(async (tx) => {
      // Resolve products server-side (never trust client prices)
      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const itemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        // Synchronous stock verification
        if (product.manageStock && product.stock < item.quantity) {
          throw new BadRequestException(`Impossible de commander: Stock insuffisant pour le produit ${product.sku || product.id}. Disponible: ${product.stock}`);
        }

        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return {
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          productName: product.sku ?? product.id,
          productSku: product.sku ?? null,
        };
      });

      // Synchronous stock deduction
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        if (product.manageStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: userId ?? undefined,
          guestEmail: dto.guestEmail,
          currency: 'XOF',
          subtotal,
          total: subtotal,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId,
          notes: dto.notes,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // TODO: send order confirmation email
      // await this.mail.sendOrderConfirmation({ ... });

      return order;
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);
    return paginate(orders, total, query);
  }

  async findMyOrders(userId: string, query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = { userId };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(orders, total, query);
  }

  async findOne(id: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== 'ADMIN' && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');
    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status as
          | 'PENDING'
          | 'PROCESSING'
          | 'COMPLETED'
          | 'CANCELLED'
          | 'REFUNDED'
          | 'FAILED',
      },
    });
  }
}
