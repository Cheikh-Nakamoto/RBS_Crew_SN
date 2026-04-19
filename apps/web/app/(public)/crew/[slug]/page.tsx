import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { ArtistGallery } from '@/components/composite/artist-gallery';

interface Props {
  params: Promise<{ slug: string }>;
}

interface ArtistDetail {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImageUrl?: string;
  avatarUrl?: string;
  instagramUrl?: string;
  genre?: string;
  nationality?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  videoUrl?: string;
  translations: Array<{ locale: string; name: string; bio?: string }>;
  artworks?: Array<{ position: number; imageUrl: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;

  // Pause artificielle pour garantir l'affichage du magnifique loader "Sharingon"
  await new Promise(resolve => setTimeout(resolve, 800));

  let artist: ArtistDetail;
  try {
    artist = await api
      .get(`artists/${slug}`, { headers: { 'Accept-Language': 'fr' } })
      .json<ArtistDetail>();
  } catch {
    notFound();
  }

  const t = artist.translations.find((x) => x.locale === 'fr') ?? artist.translations[0];
  const portraitUrl = artist.avatarUrl || artist.featuredImageUrl;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Back */}
      <Link
        href="/crew"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-10 transition-colors duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Retour au Crew
      </Link>

      <div className="grid md:grid-cols-[320px_1fr] gap-12 items-start">
        {/* Portrait */}
        {portraitUrl && (
          <div className="relative w-full aspect-square md:aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl shadow-black/40 flex-shrink-0 group">
            <Image
              src={portraitUrl}
              alt={t?.name ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          <div>
            <span className="tag-graffiti mb-4 inline-block">RBS Crew</span>
            <h1 className="font-display text-5xl sm:text-6xl text-white leading-tight mt-3">
              {t?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {artist.city && (
                <p className="flex items-center gap-2 text-white/45">
                  <MapPin className="w-4 h-4 text-[oklch(0.72_0.19_48)]" />
                  {artist.city}{artist.country ? `, ${artist.country}` : ''}
                </p>
              )}
              {artist.genre && (
                <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs text-white/70 font-medium">
                  {artist.genre}
                </span>
              )}
              {artist.nationality && (
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
                  {artist.nationality}
                </span>
              )}
            </div>

            {/* Social links */}
            <div className="flex flex-wrap gap-2 mt-4">
              {([
                { url: artist.instagramUrl, label: 'Instagram', color: 'oklch(0.60 0.25 345)' },
                { url: artist.tiktokUrl, label: 'TikTok', color: 'white' },
                { url: artist.facebookUrl, label: 'Facebook', color: 'oklch(0.65 0.15 240)' },
                { url: artist.twitterUrl, label: 'X', color: 'white' },
                { url: artist.youtubeUrl, label: 'YouTube', color: 'oklch(0.60 0.22 25)' },
                { url: artist.spotifyUrl, label: 'Spotify', color: 'oklch(0.72 0.22 142)' },
                { url: artist.soundcloudUrl, label: 'SoundCloud', color: 'oklch(0.70 0.20 40)' },
                { url: artist.websiteUrl, label: 'Site web', color: 'white' },
              ]).filter(s => s.url).map(({ url, label }) => (
                <a
                  key={label}
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-all duration-200"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Decorative accent line */}
          <div className="w-16 h-1 bg-gradient-to-r from-[oklch(0.72_0.19_48)] to-[oklch(0.60_0.25_345)] rounded-full" />

          {t?.bio ? (
            <div
              className="prose prose-invert prose-p:leading-relaxed prose-a:text-[oklch(0.72_0.19_48)] hover:prose-a:text-white max-w-none text-white/60 text-lg font-light tracking-wide"
              dangerouslySetInnerHTML={{ __html: t.bio }}
            />
          ) : (
            <p className="text-white/30 italic">Biographie à venir.</p>
          )}

          {/* Video embed */}
          {artist.videoUrl && (
            <div className="mt-8">
              <p className="text-sm text-white/40 mb-3 uppercase tracking-widest font-mono">Vidéo</p>
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
                <iframe
                  src={artist.videoUrl.replace('watch?v=', 'embed/')}
                  title={`Vidéo de ${t?.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Artworks Gallery */}
      {artist.artworks && artist.artworks.length > 0 && (
        <div className="mt-24 pt-16 border-t border-white/5">
          <SectionHeader
            eyebrow="Portfolio"
            title="Galerie & Œuvres"
            subtitle={`Découvrez les créations artistiques de ${t?.name}.`}
            className="mb-12"
          />
          <ArtistGallery artworks={artist.artworks} />
        </div>
      )}
    </div>
  );
}
