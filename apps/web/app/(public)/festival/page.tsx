import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowRight, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollReveal, StaggerReveal, StaggerItem } from '@/components/ui/scroll-reveal';

interface FestivalEditionItem {
  id: string;
  slug: string;
  editionNumber: number;
  year: number;
  city?: string;
  country: string;
  mainImage?: string;
  heroImage?: string;
  gallery?: string[];
  typography?: string[];
  translations: Array<{ locale: string; themeName: string; summary?: string; content?: string }>;
}

export const metadata = { title: 'Festival — Last Wall Tour' };

export const dynamic = 'force-dynamic';

export default async function FestivalPage() {
  // Pause artificielle pour montrer le loader
  await new Promise(resolve => setTimeout(resolve, 800));

  let editions: FestivalEditionItem[] = [];
  let fetchError = false;

  try {
    const data = await api
      .get('festival', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<FestivalEditionItem[]>>();
    editions = data?.data ?? [];
  } catch {
    fetchError = true;
  }

  return (
    <div id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <ScrollReveal>
        <SectionHeader
          eyebrow="RBS Crew SN"
          title="Last Wall Tour"
          subtitle="Les éditions du festival de graffiti international organisé par le RBS Crew à Dakar."
          className="mb-16"
        />
      </ScrollReveal>

      {fetchError && <ErrorState />}
      {!fetchError && editions.length === 0 && <EmptyState title="Aucune édition disponible" />}

      {!fetchError && editions.length > 0 && (
        <div className="relative">
          {/* Vertical timeline line — brand gradient */}
          <div
            aria-hidden="true"
            className="absolute left-[3.75rem] top-4 bottom-4 w-px hidden sm:block"
            style={{
              background:
                'linear-gradient(to bottom, var(--rbs-gold) 0%, var(--rbs-red) 40%, oklch(0.72 0.19 48 / 0.1) 85%, transparent 100%)',
            }}
          />

          <StaggerReveal className="space-y-10">
            {editions.map((edition) => {
              const t =
                edition.translations.find((x) => x.locale === 'fr') ?? edition.translations[0];
              const galleryThumbs = (edition.gallery ?? []).slice(0, 4);

              return (
                <StaggerItem
                  key={edition.id}
                  className="relative flex gap-0 sm:gap-10 items-start"
                >
                  {/* Edition bubble — desktop timeline marker */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-[7.5rem] pt-2">
                    <div className="relative z-10 w-12 h-12 rounded-full bg-[var(--rbs-gold)]/15 border-2 border-[var(--rbs-gold)]/60 flex items-center justify-center mb-2 shadow-[0_0_20px_oklch(0.72_0.19_48/0.35)] transition-all duration-300">
                      <span className="font-display font-bold text-base text-[var(--rbs-gold)]">
                        {edition.editionNumber}
                      </span>
                    </div>
                    <span className="text-[0.65rem] font-mono font-bold tracking-widest text-white/55 uppercase">
                      {edition.year}
                    </span>
                  </div>

                  {/* Edition card */}
                  <Link
                    href={`/festival/${edition.slug}`}
                    aria-label={`Découvrir l'édition ${edition.editionNumber} — ${t?.themeName ?? ''}`}
                    className="group relative flex-1 rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 hover:ring-[var(--rbs-gold)]/50 flex flex-col sm:flex-row hover:shadow-[var(--shadow-glow-gold)] transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
                  >
                    {/* Brand stripe — top gradient accent */}
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-0 right-0 h-0.5 z-[3] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          'linear-gradient(90deg, var(--rbs-red) 0%, var(--rbs-gold) 50%, var(--rbs-green) 100%)',
                      }}
                    />

                    {/* Hero image */}
                    {edition.mainImage && (
                      <div className="relative w-full sm:w-64 md:w-72 aspect-[4/3] sm:aspect-auto sm:h-auto flex-shrink-0 bg-[var(--bg-elevated)] overflow-hidden">
                        <Image
                          src={edition.mainImage}
                          alt={`${t?.themeName ?? `Édition ${edition.editionNumber}`} — Last Wall Tour`}
                          fill
                          sizes="(max-width: 640px) 100vw, 288px"
                          className="object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-[1.06] transition-all duration-700"
                        />
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40 sm:to-black/10" />
                      </div>
                    )}

                    <div className="flex-1 p-6 sm:p-7 flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 space-y-2">
                          <span className="inline-block text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--rbs-gold)]">
                            Édition {edition.editionNumber} — {edition.year}
                          </span>

                          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-white leading-[0.95] group-hover:text-[var(--rbs-gold)] transition-colors duration-300 text-balance">
                            {t?.themeName}
                          </h2>
                        </div>

                        {/* Large ghost year — desktop decoration */}
                        <span
                          aria-hidden="true"
                          className="font-display text-6xl md:text-7xl text-white/[0.07] flex-shrink-0 leading-none hidden md:block select-none tracking-tighter"
                        >
                          {edition.year}
                        </span>
                      </div>

                      {/* Location */}
                      {edition.city && (
                        <p className="flex items-center gap-1.5 text-sm text-white/65 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-[var(--rbs-red)] flex-shrink-0" aria-hidden="true" />
                          {edition.city}, {edition.country}
                        </p>
                      )}

                      {/* Summary */}
                      {t?.summary && (
                        <p className="text-white/65 leading-relaxed text-sm line-clamp-3 mb-4 text-balance">
                          {t.summary}
                        </p>
                      )}

                      {/* Gallery thumbnails preview */}
                      {galleryThumbs.length > 0 && (
                        <div className="flex -space-x-2 mb-4">
                          {galleryThumbs.map((src, idx) => (
                            <div
                              key={idx}
                              className="relative w-12 h-12 rounded-lg overflow-hidden ring-2 ring-black bg-[var(--bg-elevated)]"
                            >
                              <Image
                                src={src}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                                aria-hidden="true"
                              />
                            </div>
                          ))}
                          {(edition.gallery?.length ?? 0) > galleryThumbs.length && (
                            <div className="relative w-12 h-12 rounded-lg bg-black/60 backdrop-blur-sm ring-2 ring-black flex items-center justify-center">
                              <span className="text-[0.65rem] font-mono font-bold text-white/80">
                                +{(edition.gallery?.length ?? 0) - galleryThumbs.length}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--rbs-gold)] group-hover:text-white transition-colors duration-300">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Découvrir la galerie</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerReveal>
        </div>
      )}
    </div>
  );
}
