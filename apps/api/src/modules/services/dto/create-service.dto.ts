import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  menuOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString() // DRAFT or PUBLISHED
  status?: string;

  @ApiProperty({ description: 'Translations for Title and Description' })
  @IsNotEmpty()
  translations: Record<
    string,
    { title: string; description: string; metaTitle?: string; metaDescription?: string }
  >;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
