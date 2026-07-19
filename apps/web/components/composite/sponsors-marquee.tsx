'use client';

import Image from 'next/image';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface SponsorsMarqueeProps {
  /** Array of logo URLs (from /public) */
  logos?: string[];
}

/* ── Default logos ────────────────────────────────────────────────────────── */

const DEFAULT_LOGOS: string[] = [
  '/sponsort_0.png',
  '/sponsort_1.png',
  '/sponsort_2.png',
  '/sponsort_3.png',
  '/sponsort_4.png',
  '/sponsort_5.png',
  '/sponsort_6.png',
  '/sponsort_7.png',
  '/sponsort_8.png',
  '/sponsort_9.png',
  '/sponsort_A.png',
  '/sponsort_B.png',
  '/sponsort_C.png',
  '/sponsort_D.png',
  '/sponsort_E.png',
  '/sponsort_F.png',
];

/* ── Component ────────────────────────────────────────────────────────────── */

export function SponsorsMarquee({ logos = DEFAULT_LOGOS }: SponsorsMarqueeProps) {
  // Split logos into two rows
  const mid = Math.ceil(logos.length / 2);
  const row1 = logos.slice(0, mid);
  const row2 = logos.slice(mid);

  return (
    <section className="relative w-full overflow-hidden py-3 md:py-4 bg-white">
   

      {/* Row 1 — scrolls left */}
      <div className="w-full overflow-hidden mb-2 md:mb-3">
        <div className="flex items-center w-max animate-marquee-left">
          {[...row1, ...row1, ...row1].map((logo, i) => (
            <div
              key={`r1-${i}`}
              className="flex-shrink-0 flex items-center justify-center px-4 sm:px-8 md:px-12"
            >
              <Image
                src={logo}
                alt={`Partenaire ${(i % row1.length) + 1}`}
                width={180}
                height={80}
                className="object-contain max-h-[50px] sm:max-h-[70px] md:max-h-[85px] w-auto transition-opacity duration-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="w-full overflow-hidden">
        <div className="flex items-center w-max animate-marquee-right">
          {[...row2, ...row2, ...row2].map((logo, i) => (
            <div
              key={`r2-${i}`}
              className="flex-shrink-0 flex items-center justify-center px-4 sm:px-8 md:px-12"
            >
              <Image
                src={logo}
                alt={`Partenaire ${(i % row2.length) + 1}`}
                width={180}
                height={80}
                className="object-contain max-h-[50px] sm:max-h-[70px] md:max-h-[85px] w-auto transition-opacity duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
