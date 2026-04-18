import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';

interface PressItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  logoUrl?: string;
  excerpt?: string;
  date?: string;
}

export const metadata = { title: 'Presse' };

export const dynamic = 'force-dynamic';

export default async function PressPage() {
  let mentions: PressItem[] = [];
  let fetchError = false;

  try {
    const data = await api
      .get('press', { next: { revalidate: 3600 } })
      .json<ApiResponse<PressItem[]>>();
    mentions = data.data;
  } catch {
    fetchError = true;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <SectionHeader
        eyebrow="Médias"
        title="La Presse"
        subtitle="Ce que la presse dit du RBS Crew et de ses initiatives."
        className="mb-14"
      />

      {fetchError && <ErrorState />}
      {!fetchError && mentions.length === 0 && <EmptyState title="Aucune mention dans la presse" />}

      {!fetchError && mentions.length > 0 && (
        <div className="space-y-4">
          {mentions.map((mention, i) => (
            <a
              key={mention.id}
              href={mention.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-5 sm:gap-7 bg-white/4 rounded-2xl p-5 sm:p-6 border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 card-hover"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Logo */}
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center overflow-hidden">
                {mention.logoUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={mention.logoUrl}
                      alt={mention.source}
                      fill
                      sizes="150px"
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <span className="font-display text-xs text-white/30 text-center px-1 leading-tight">
                    {mention.source.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-white group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200 line-clamp-2 leading-snug">
                    {mention.title}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-white/25 group-hover:text-[oklch(0.72_0.19_48)] flex-shrink-0 mt-0.5 transition-colors duration-200" />
                </div>
                <p className="text-sm font-medium text-[oklch(0.72_0.19_48)]">{mention.source}</p>
                {mention.excerpt && (
                  <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">{mention.excerpt}</p>
                )}
                {mention.date && (
                  <p className="text-xs text-white/25">
                    {formatDate(mention.date)}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
