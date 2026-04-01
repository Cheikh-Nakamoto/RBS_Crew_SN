import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

interface ArtistDetail {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImage?: { url: string; altText?: string };
  translations: Array<{ locale: string; name: string; bio?: string }>;
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
        {artist.featuredImage && (
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl shadow-black/40 flex-shrink-0">
            <Image
              src={artist.featuredImage.url}
              alt={t?.name ?? ''}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          <div>
            <span className="tag-graffiti mb-4 inline-block">RBS Crew</span>
            <h1 className="font-display text-5xl sm:text-6xl text-white leading-tight mt-3">
              {t?.name}
            </h1>
            {artist.city && (
              <p className="flex items-center gap-2 text-white/45 mt-3">
                <MapPin className="w-4 h-4 text-[oklch(0.72_0.19_48)]" />
                {artist.city}{artist.country ? `, ${artist.country}` : ''}
              </p>
            )}
          </div>

          {/* Decorative accent line */}
          <div className="w-16 h-1 bg-gradient-to-r from-[oklch(0.72_0.19_48)] to-[oklch(0.60_0.25_345)] rounded-full" />

          {t?.bio ? (
            <div
              className="prose prose-invert max-w-none text-white/60 leading-relaxed text-base"
              dangerouslySetInnerHTML={{ __html: t.bio }}
            />
          ) : (
            <p className="text-white/30 italic">Biographie à venir.</p>
          )}
        </div>
      </div>
    </div>
  );
}
