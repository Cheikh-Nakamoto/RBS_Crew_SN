import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Locale } from '@rbs/types';
import { ArtistsService } from './artists.service';
import { CreateArtistDto, UpdateArtistDto } from './dto/create-artist.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LocaleParam } from '../../common/decorators/locale.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List artists (locale-aware)' })
  findAll(@Query() query: PaginationQueryDto, @LocaleParam() locale: Locale) {
    return this.artistsService.findAll(query, locale);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get artist by slug' })
  findBySlug(@Param('slug') slug: string, @LocaleParam() locale: Locale) {
    return this.artistsService.findBySlug(slug, locale);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create artist (admin/editor)' })
  create(@Body() dto: CreateArtistDto) {
    return this.artistsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update artist (admin/editor)' })
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete artist (admin)' })
  remove(@Param('id') id: string) {
    return this.artistsService.remove(id);
  }
}
