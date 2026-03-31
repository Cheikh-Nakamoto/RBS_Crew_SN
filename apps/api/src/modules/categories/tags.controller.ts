import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Locale } from '@rbs/types';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LocaleParam } from '../../common/decorators/locale.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all tags (locale-aware)' })
  findAll(@LocaleParam() locale: Locale) {
    return this.tagsService.findAll(locale);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tag (admin/editor)' })
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tag (admin/editor)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTagDto>) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete tag (admin)' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
