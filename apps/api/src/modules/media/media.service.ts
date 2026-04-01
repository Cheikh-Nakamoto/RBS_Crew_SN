import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginated-response.helper';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MediaStorageService, UploadedFile } from './media-storage.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

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

  async upload(file: UploadedFile, altText?: string) {
    if (!file) throw new BadRequestException('No file provided');

    // 1. Upload to S3/Cloudflare R2
    const url = await this.mediaStorage.uploadFile(file, 'library');

    // 2. Save metadata to Postgres
    return this.prisma.media.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        altText,
      },
    });
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    
    // 1. Delete from S3/R2
    await this.mediaStorage.deleteFileByUrl(item.url);
    
    // 2. Delete from DB
    await this.prisma.media.delete({ where: { id } });
    
    return { message: 'Media deleted securely from storage and database' };
  }
}
