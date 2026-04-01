import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreatePageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  menuOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString() // DRAFT or PUBLISHED
  status?: string;

  @ApiProperty({ description: 'Translations for Title, Content, etc' })
  @IsNotEmpty()
  translations: Record<
    string,
    { title: string; slug: string; content: string; excerpt?: string; metaTitle?: string; metaDescription?: string }
  >;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}
