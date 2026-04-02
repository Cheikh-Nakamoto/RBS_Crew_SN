import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ArrowLeft, Instagram } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

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
  translations: Array<{ locale: string; name: string; bio?: string }>;
  artworks?: Array<{ position: number; imageUrl: string }>;
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
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
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {artist.city && (
                <p className="flex items-center gap-2 text-white/45">
                  <MapPin className="w-4 h-4 text-[oklch(0.72_0.19_48)]" />
                  {artist.city}{artist.country ? `, ${artist.country}` : ''}
                </p>
              )}
              {artist.instagramUrl && (
                <a
                  href={artist.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white shadow-xl bg-gradient-to-r hover:to-[oklch(0.72_0.19_48)] hover:from-[oklch(0.60_0.25_345)] from-white/10 to-white/5 px-4 py-2 rounded-full border border-white/10 transition-all duration-300 hover:scale-105 group"
                >
                  <Instagram className="w-4 h-4 text-[oklch(0.60_0.25_345)] group-hover:text-white transition-colors" />
                  Instagram
                </a>
              )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artist.artworks.map((artwork, idx) => (
              <div
                key={artwork.imageUrl}
                className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 aspect-square shadow-lg"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <Image
                  src={artwork.imageUrl}
                  alt={`Artwork ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/90 via-[#09090b]/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-8">
                  <span className="text-white/90 font-display text-lg tracking-wide translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    Agrandir
                  </span>
                  <div className="w-8 h-px bg-[oklch(0.72_0.19_48)] mt-3 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100 scale-x-0 group-hover:scale-x-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
