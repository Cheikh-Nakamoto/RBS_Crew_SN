import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateArtistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  featuredImageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  avatarId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Media IDs for the artist artworks gallery' })
  @IsOptional()
  @IsString({ each: true })
  artworkIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Translations: { fr: { name, bio }, en: {...} }' })
  translations: Record<string, { name: string; bio?: string }>;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
