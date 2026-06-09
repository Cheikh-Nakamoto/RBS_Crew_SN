'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface CrewMember {
  name: string;
  role?: string;
  imageUrl: string;
  slug?: string;
}

export interface CrewHeroProps {
  members: CrewMember[];
  cta?: { label: string; href: string };
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function CrewHero({ members, cta }: CrewHeroProps) {
  const displayed = members.slice(0, 4);

  return (
    <section className="relative w-full overflow-hidden border-t border-white/10 bg-transparent noise-texture">
      <div className="relative mx-auto max-w-[90rem] px-6 py-20 md:py-28">

        {/* ── Section header ────────────────────── */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-14 md:mb-20">
            <div className="w-full text-center">
              <h2
                className="text-dj-gross text-[clamp(3rem,8vw,6rem)] leading-[0.9] uppercase tracking-tighter select-none"
                style={{
                  WebkitTextStroke: '2px rgba(230, 243, 1, 0.95)',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 8px var(--rbs-gold)) drop-shadow(0 0 20px var(--rbs-gold))',
                }}
              >
                Le Collectif
              </h2>
            </div>
            {cta && (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold uppercase tracking-wider transition-colors group"
              >
                {cta.label}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            )}
          </div>
        </ScrollReveal>

        {/* ── Members grid — tilted cards ────────── */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10">
          {displayed.map((member, i) => (
            <ScrollReveal key={member.name} from="bottom" delay={0.1 + i * 0.12}>
              <div
                className="group relative"
                style={{ transform: 'rotate(6deg)' }}
              >
                {/* Card container */}
                <div 
                  className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] overflow-hidden rounded-lg transition-all duration-500 ease-out group-hover:scale-105 group-hover:shadow-[0_0_40px_oklch(0.52_0.20_18/0.35)]"
                  style={{
                    backgroundImage: i % 2 === 0 ? "url('/baground_green.png')" : "url('/background_red_jail.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Image */}
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    sizes="300px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />

                  {/* Red accent line at top */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--rbs-red)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Member info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-display text-white text-lg md:text-xl uppercase tracking-tight leading-tight">
                      {member.name}
                    </h3>
                    {member.role && (
                      <p className="text-white/50 text-xs uppercase tracking-[0.15em] mt-1 group-hover:text-[var(--rbs-red-light)] transition-colors duration-500">
                        {member.role}
                      </p>
                    )}
                  </div>
                </div>

                {/* Decorative index number */}
                <span
                  aria-hidden="true"
                  className="absolute -top-4 -left-3 font-display text-5xl text-white/[0.06] select-none pointer-events-none leading-none"
                  style={{ transform: 'rotate(-6deg)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
