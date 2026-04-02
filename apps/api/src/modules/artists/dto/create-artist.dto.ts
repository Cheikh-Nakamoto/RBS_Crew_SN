import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ description: 'Direct Cloudflare R2 URL for the featured image' })
  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;

  @ApiPropertyOptional({ description: 'Direct Cloudflare R2 URL for the avatar/portrait' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Ordered list of Cloudflare R2 URLs for artworks gallery' })
  @IsOptional()
  @IsString({ each: true })
  artworkUrls?: string[];

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

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
