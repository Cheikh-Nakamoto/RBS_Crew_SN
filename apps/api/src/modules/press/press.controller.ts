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
import { PressService } from './press.service';
import { CreatePressDto } from './dto/create-press.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Press')
@Controller('press')
export class PressController {
  constructor(private readonly pressService: PressService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List press mentions (sorted by date desc)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.pressService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get press mention by id' })
  findOne(@Param('id') id: string) {
    return this.pressService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create press mention (admin/editor)' })
  create(@Body() dto: CreatePressDto) {
    return this.pressService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update press mention (admin/editor)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePressDto>) {
    return this.pressService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete press mention (admin)' })
  remove(@Param('id') id: string) {
    return this.pressService.remove(id);
  }
}
