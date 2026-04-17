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

export default async function FestivalPage() {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
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
          {/* Vertical timeline line */}
          <div
            className="absolute left-[3.75rem] top-4 bottom-4 w-px hidden sm:block"
            style={{
              background:
                'linear-gradient(to bottom, var(--rbs-gold, oklch(0.72 0.19 48)) 0%, oklch(0.72 0.19 48 / 10%) 80%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          <StaggerReveal className="space-y-8">
            {editions.map((edition) => {
              const t =
                edition.translations.find((x) => x.locale === 'fr') ?? edition.translations[0];

              return (
                <StaggerItem
                  key={edition.id}
                  className="relative flex gap-0 sm:gap-10 items-start"
                >
                  {/* Edition bubble — desktop */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-[7.5rem]">
                    <div
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-1 relative z-10"
                      style={{
                        backgroundColor: 'oklch(0.72 0.19 48 / 15%)',
                        borderColor: 'oklch(0.72 0.19 48 / 50%)',
                      }}
                    >
                      <span
                        className="font-display text-sm"
                        style={{ color: 'var(--rbs-gold, oklch(0.72 0.19 48))' }}
                      >
                        {edition.editionNumber}
                      </span>
                    </div>
                    <span className="text-xs text-white/30 font-mono">{edition.year}</span>
                  </div>

                  {/* Edition card */}
                  <Link
                    href={`/festival/${edition.slug}`}
                    className="flex-1 rounded-2xl border border-white/8 bg-white/4 overflow-hidden flex flex-col sm:flex-row gap-0 sm:gap-6 cursor-pointer group card-hover p-0 sm:p-6 hover:border-[var(--rbs-gold,oklch(0.72_0.19_48))/35%] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-red)]/50"
                    aria-label={`Découvrir l'édition ${edition.editionNumber} — ${t?.themeName ?? ''}`}
                  >
                    {/* Image */}
                    {edition.mainImage && (
                      <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-white/5 rounded-t-2xl sm:rounded-2xl overflow-hidden">
                        <Image
                          src={edition.mainImage}
                          alt={`${t?.themeName ?? `Édition ${edition.editionNumber}`} — Last Wall Tour`}
                          fill
                          sizes="(max-width: 640px) 100vw, 192px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 p-6 sm:p-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 gap-4">
                        <div className="flex-1">
                          {/* Mobile tag */}
                          <div className="sm:hidden mb-2">
                            <span className="tag-graffiti">Édition {edition.editionNumber}</span>
                          </div>

                          <span
                            className="text-xs font-semibold uppercase tracking-widest"
                            style={{ color: 'var(--rbs-gold, oklch(0.72 0.19 48))' }}
                          >
                            Édition {edition.editionNumber} — {edition.year}
                          </span>

                          <h2
                            className="font-display text-2xl sm:text-3xl text-white mt-2 leading-tight transition-colors duration-300"
                            style={{}}
                          >
                            <span className="group-hover:text-[var(--rbs-gold,oklch(0.72_0.19_48))] transition-colors duration-300">
                              {t?.themeName}
                            </span>
                          </h2>
                        </div>

                        {/* Large year — decorative */}
                        <span className="font-display text-5xl text-white/6 flex-shrink-0 leading-none hidden md:block select-none">
                          {edition.year}
                        </span>
                      </div>

                      {/* Location */}
                      {edition.city && (
                        <p className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-[var(--rbs-red)] flex-shrink-0" aria-hidden="true" />
                          {edition.city}, {edition.country}
                        </p>
                      )}

                      {/* Summary */}
                      {t?.summary && (
                        <p className="text-white/50 leading-relaxed text-sm line-clamp-3 mb-4 text-balance">
                          {t.summary}
                        </p>
                      )}

                      {/* CTA */}
                      <div
                        className="text-sm font-semibold flex items-center gap-2 group-hover:translate-x-1 transition-transform"
                        style={{ color: 'var(--rbs-gold, oklch(0.72 0.19 48))' }}
                      >
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        Découvrir la galerie
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
