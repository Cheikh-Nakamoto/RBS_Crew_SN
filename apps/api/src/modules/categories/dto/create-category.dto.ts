import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'Translations map: { fr: { name, description }, en: { ... } }' })
  translations: Record<string, { name: string; description?: string }>;
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Translations map: { fr: { name }, en: { name } }' })
  translations: Record<string, { name: string }>;
}
