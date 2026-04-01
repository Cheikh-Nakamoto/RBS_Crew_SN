import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all services (paginated, localized)' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = (acceptLanguage || 'fr').split(',')[0].trim().substring(0, 2);
    return this.servicesService.findAll(query, locale);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a specific service by slug' })
  findBySlug(
    @Param('slug') slug: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = (acceptLanguage || 'fr').split(',')[0].trim().substring(0, 2);
    return this.servicesService.findBySlug(slug, locale);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Post()
  @ApiOperation({ summary: 'Create a new service (Admin/Editor)' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a service (Admin/Editor)' })
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service (Admin only)' })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
