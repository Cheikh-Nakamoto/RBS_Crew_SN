import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/ui/countdown';
import { cn } from '@/lib/utils';

export interface UpcomingFestivalArtist {
  artistId: string;
  artistName: string;
  artistSlug?: string;
}

export interface UpcomingFestival {
  id: string;
  slug: string;
  editionNumber: number;
  year: number;
  city?: string;
  country?: string;
  mainImage?: string;
  heroImage?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  venueAddress?: string;
  ticketUrl?: string;
  translations: Array<{ locale: string; themeName: string; summary?: string }>;
  artists?: UpcomingFestivalArtist[];
}

interface UpcomingFestivalHeroProps {
  edition: UpcomingFestival;
  /** `home` : bloc d'accroche. `festival` : en-tête de la page festival, avec lineup. */
  variant?: 'home' | 'festival';
  className?: string;
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** « du 12 au 15 mars 2027 », ou une date seule quand endDate manque. */
function formatRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  if (!endDate) return DATE_FMT.format(start);
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return DATE_FMT.format(start);
  return `Du ${DATE_FMT.format(start)} au ${DATE_FMT.format(end)}`;
}

export function UpcomingFestivalHero({
  edition,
  variant = 'home',
  className,
}: UpcomingFestivalHeroProps) {
  const t =
    edition.translations.find((x) => x.locale === 'fr') ?? edition.translations[0];
  const image = edition.heroImage || edition.mainImage;
  const dates = formatRange(edition.startDate, edition.endDate);
  const place = [edition.venue, edition.city].filter(Boolean).join(' — ');
  const lineup = variant === 'festival' ? (edition.artists ?? []).slice(0, 12) : [];

  return (
    <section
      aria-labelledby={`upcoming-festival-${edition.id}`}
      className={cn(
        'relative overflow-hidden rounded-2xl ring-1 ring-[var(--rbs-gold)]/25 bg-[var(--bg-elevated)]',
        variant === 'home' && 'mx-auto w-[95%] sm:max-w-[90rem] my-16',
        className
      )}
    >
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 90rem"
            className="object-cover"
            aria-hidden="true"
            priority={variant === 'home'}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-black/45"
          />
        </>
      )}

      {/* Liseré de marque */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-0.5 z-[3]"
        style={{
          background:
            'linear-gradient(90deg, var(--rbs-red) 0%, var(--rbs-gold) 50%, var(--rbs-green) 100%)',
        }}
      />

      <div className="relative z-[4] px-6 py-10 sm:px-10 sm:py-14 flex flex-col gap-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--rbs-gold)]/15 ring-1 ring-[var(--rbs-gold)]/45 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[var(--rbs-gold)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--rbs-gold)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--rbs-gold)]" />
            </span>
            Prochaine édition
          </span>
          <span className="text-[0.65rem] font-mono font-bold uppercase tracking-[0.2em] text-white/60">
            Édition {edition.editionNumber} — {edition.year}
          </span>
        </div>

        <h2
          id={`upcoming-festival-${edition.id}`}
          className="font-display text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight leading-[0.95] text-white text-balance"
        >
          {t?.themeName ?? 'Last Wall Tour'}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
          {dates && (
            <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--rbs-gold)]" aria-hidden="true" />
              {dates}
            </p>
          )}
          {place && (
            <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--rbs-red)]" aria-hidden="true" />
              {place}
              {edition.country && edition.city ? `, ${edition.country}` : ''}
            </p>
          )}
        </div>

        {t?.summary && (
          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-white/70 text-balance">
            {t.summary}
          </p>
        )}

        {edition.startDate && <Countdown target={edition.startDate} />}

        {lineup.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">
              Line-up
            </span>
            <ul className="flex flex-wrap gap-2">
              {lineup.map((a) => (
                <li key={a.artistId}>
                  {a.artistSlug ? (
                    <Link
                      href={`/crew/${a.artistSlug}`}
                      className="inline-flex min-h-[44px] items-center rounded-lg bg-white/[0.06] px-3 ring-1 ring-white/10 text-sm text-white/80 hover:text-white hover:ring-[var(--rbs-gold)]/50 transition-colors"
                    >
                      {a.artistName}
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[44px] items-center rounded-lg bg-white/[0.06] px-3 ring-1 ring-white/10 text-sm text-white/80">
                      {a.artistName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {edition.ticketUrl ? (
            <Button asChild variant="solid-premium" size="xl" className="group/cta uppercase tracking-[0.15em]">
              <a href={edition.ticketUrl} target="_blank" rel="noopener noreferrer">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Billetterie
              </a>
            </Button>
          ) : null}
          <Button
            asChild
            variant={edition.ticketUrl ? 'outline-neon' : 'solid-premium'}
            size="xl"
            className="group/cta uppercase tracking-[0.15em]"
          >
            <Link href={`/festival/${edition.slug}`}>
              Voir l&apos;édition
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
