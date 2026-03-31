import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFestivalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  editionNumber: number;

  @ApiProperty()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ default: 'SN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Translations: { fr: { themeName, summary, content }, en: {...} }' })
  translations: Record<string, { themeName: string; summary?: string; content?: string }>;
}
