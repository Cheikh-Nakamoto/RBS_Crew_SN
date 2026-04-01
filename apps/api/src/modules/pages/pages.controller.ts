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
import { PagesService } from './pages.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all pages (paginated, localized)' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = (acceptLanguage || 'fr').split(',')[0].trim().substring(0, 2);
    return this.pagesService.findAll(query, locale);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a specific page by slug' })
  findBySlug(
    @Param('slug') slug: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = (acceptLanguage || 'fr').split(',')[0].trim().substring(0, 2);
    return this.pagesService.findBySlug(slug, locale);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Post()
  @ApiOperation({ summary: 'Create a new page (Admin/Editor)' })
  create(@Body() createPageDto: CreatePageDto) {
    return this.pagesService.create(createPageDto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a page (Admin/Editor)' })
  update(@Param('id') id: string, @Body() updatePageDto: UpdatePageDto) {
    return this.pagesService.update(id, updatePageDto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a page (Admin only)' })
  remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}
