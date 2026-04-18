import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

interface ArtistItem {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImageUrl?: string;
  avatarUrl?: string;
  translations: Array<{ locale: string; name: string; bio?: string }>;
}

export const metadata = { title: 'Crew' };

export const dynamic = 'force-dynamic';

export default async function CrewPage() {
  let artists: ArtistItem[] = [];
  let fetchError = false;

  try {
    const data = await api
      .get('artists', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<ArtistItem[]>>();
    artists = data.data;
  } catch {
    fetchError = true;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <SectionHeader
        eyebrow="RBS Crew SN"
        title="Le Crew"
        subtitle="Les artistes qui font vivre le collectif depuis 2012 — Dakar et à travers le monde."
        className="mb-14"
      />

      {fetchError && <ErrorState />}
      {!fetchError && artists.length === 0 && <EmptyState title="Aucun artiste trouvé" />}

      {!fetchError && artists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 lg:gap-6">
          {artists.map((artist, i) => {
            const t =
              artist.translations.find((x) => x.locale === 'fr') ?? artist.translations[0];
            return (
              <Link
                key={artist.id}
                href={`/crew/${artist.slug}`}
                className="group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Square portrait */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/8 group-hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 card-hover mb-3">
                  {artist.avatarUrl || artist.featuredImageUrl ? (
                    <>
                      <Image
                        src={artist.avatarUrl || artist.featuredImageUrl || ''}
                        alt={t?.name ?? ''}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-start justify-end p-4">
                        {t?.bio && (
                          <p className="text-white/70 text-xs line-clamp-2 leading-relaxed">
                            {t.bio.replace(/<[^>]+>/g, '')}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/4">
                      <span className="font-display text-5xl text-white/20">
                        {t?.name?.[0] ?? '?'}
                      </span>
                    </div>
                  )}

                  {/* Number badge */}
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-lg glass border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-display text-white/60">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Info below image */}
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200">
                    {t?.name}
                  </h3>
                  {artist.city && (
                    <p className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {artist.city}
                      {artist.country ? `, ${artist.country}` : ''}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
