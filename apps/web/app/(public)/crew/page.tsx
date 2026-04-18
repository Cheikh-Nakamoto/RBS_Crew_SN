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
    <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <SectionHeader
        eyebrow="RBS Crew SN"
        title="Le Crew"
        subtitle="Les artistes qui font vivre le collectif depuis 2012 — Dakar et à travers le monde."
        className="mb-14"
      />

      {fetchError && <ErrorState />}
      {!fetchError && artists.length === 0 && <EmptyState title="Aucun artiste trouvé" />}

      {!fetchError && artists.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {artists.map((artist, i) => {
            const t =
              artist.translations.find((x) => x.locale === 'fr') ?? artist.translations[0];
            const img = artist.avatarUrl || artist.featuredImageUrl;
            const initial = t?.name?.[0] ?? '?';
            return (
              <li key={artist.id}>
                <Link
                  href={`/crew/${artist.slug}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/60 focus-visible:ring-offset-4 focus-visible:ring-offset-black rounded-2xl"
                  aria-label={`${t?.name ?? 'Artiste'}${artist.city ? ` — ${artist.city}` : ''}`}
                >
                  {/* Editorial portrait — full-bleed photo + overlay */}
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[var(--bg-elevated)] ring-1 ring-white/10 group-hover:ring-[var(--rbs-gold)]/50 transition-all duration-500 group-hover:shadow-[var(--shadow-glow-gold)] group-active:scale-[0.98]">
                    {img ? (
                      <Image
                        src={img}
                        alt={t?.name ?? ''}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover grayscale-[0.3] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)]">
                        <span className="font-display text-7xl text-white/20">{initial}</span>
                      </div>
                    )}

                    {/* Gradient overlay — readable name + meta on bottom */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-95"
                    />

                    {/* Index badge — top-left */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                      <span className="text-[0.65rem] font-mono font-bold tracking-widest text-white/85">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Brand stripe — top-right gold accent */}
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 w-1 h-12 bg-gradient-to-b from-[var(--rbs-gold)] via-[var(--rbs-red)] to-transparent"
                    />

                    {/* Name + meta — overlay bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5">
                      <h3 className="font-display text-base sm:text-lg leading-tight uppercase tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {t?.name}
                      </h3>
                      {artist.city && (
                        <p className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.15em] text-[var(--rbs-gold)] uppercase">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {artist.city}
                          {artist.country ? `, ${artist.country}` : ''}
                        </p>
                      )}

                      {t?.bio && (
                        <p className="hidden md:block text-white/80 text-xs leading-relaxed line-clamp-2 max-h-0 group-hover:max-h-20 opacity-0 group-hover:opacity-100 transition-all duration-300 mt-1">
                          {t.bio.replace(/<[^>]+>/g, '')}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
