import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPin } from 'lucide-react';

interface FestivalEditionItem {
  id: string;
  slug: string;
  editionNumber: number;
  year: number;
  city?: string;
  country: string;
  translations: Array<{ locale: string; themeName: string; summary?: string }>;
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <SectionHeader
        eyebrow="RBS Crew SN"
        title="Last Wall Tour"
        subtitle="Les éditions du festival de graffiti international organisé par le RBS Crew à Dakar."
        className="mb-16"
      />

      {fetchError && <ErrorState />}
      {!fetchError && editions.length === 0 && <EmptyState title="Aucune édition disponible" />}

      {!fetchError && editions.length > 0 && (
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[3.75rem] top-4 bottom-4 w-px hidden sm:block"
            style={{
              background:
                'linear-gradient(to bottom, oklch(0.72 0.19 48 / 40%), oklch(0.60 0.25 345 / 20%), transparent)',
            }}
          />

          <div className="space-y-8">
            {editions.map((edition, i) => {
              const t =
                edition.translations.find((x) => x.locale === 'fr') ?? edition.translations[0];
              return (
                <div
                  key={edition.id}
                  className="relative flex gap-0 sm:gap-10 items-start"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Edition number bubble — desktop */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-[7.5rem]">
                    <div className="w-10 h-10 rounded-full bg-[oklch(0.72_0.19_48/15%)] border-2 border-[oklch(0.72_0.19_48/50%)] flex items-center justify-center mb-1 relative z-10">
                      <span className="font-display text-sm text-[oklch(0.72_0.19_48)]">{edition.editionNumber}</span>
                    </div>
                    <span className="text-xs text-white/30 font-mono">{edition.year}</span>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white/4 rounded-2xl border border-white/8 hover:border-[oklch(0.72_0.19_48/35%)] transition-all duration-300 p-6 group card-hover">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div className="flex-1">
                        {/* Mobile edition tag */}
                        <div className="sm:hidden mb-2">
                          <span className="tag-graffiti">Édition {edition.editionNumber}</span>
                        </div>
                        <span className="text-xs font-semibold text-[oklch(0.72_0.19_48)] uppercase tracking-widest">
                          Édition {edition.editionNumber} — {edition.year}
                        </span>
                        <h2 className="font-display text-2xl sm:text-3xl text-white mt-2 group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-300 leading-tight">
                          {t?.themeName}
                        </h2>
                      </div>
                      {/* Large year */}
                      <span className="font-display text-5xl text-white/6 flex-shrink-0 leading-none hidden md:block">
                        {edition.year}
                      </span>
                    </div>

                    {edition.city && (
                      <p className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-[oklch(0.72_0.19_48)]" />
                        {edition.city}, {edition.country}
                      </p>
                    )}

                    {t?.summary && (
                      <p className="text-white/50 leading-relaxed text-sm">{t.summary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
