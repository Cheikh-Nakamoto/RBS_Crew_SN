import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Locale } from '@rbs/types';
import { FestivalService } from './festival.service';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LocaleParam } from '../../common/decorators/locale.decorator';

@ApiTags('Festival')
@Controller('festival')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all festival editions (sorted by year desc)' })
  findAll(@LocaleParam() locale: Locale) {
    return this.festivalService.findAll(locale);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get festival edition by slug' })
  findBySlug(@Param('slug') slug: string, @LocaleParam() locale: Locale) {
    return this.festivalService.findBySlug(slug, locale);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create festival edition (admin/editor)' })
  create(@Body() dto: CreateFestivalDto) {
    return this.festivalService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update festival edition (admin/editor)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateFestivalDto>) {
    return this.festivalService.update(id, dto);
  }
}
