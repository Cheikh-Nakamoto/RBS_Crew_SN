'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { ScrollReveal, StaggerReveal, StaggerItem } from '@/components/ui/scroll-reveal';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface EditionHeroStat {
  value: string;
  label: string;
}

export interface EditionHeroProps {
  /** Edition number, e.g. 10 */
  editionNumber: number;
  /** Edition year, e.g. 2026 */
  year: number;
  /** Theme name, e.g. "AKOBEN" */
  themeName: string;
  /** Festival description paragraph */
  description: string;
  /** 6 images for the masonry gallery grid */
  galleryImages: string[];
  /** Aggregate stats displayed below the gallery */
  stats: EditionHeroStat[];
  /** LWT logo URL (optional, falls back to bundled asset) */
  logoUrl?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function StatCountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const numericMatch = value.match(/^(\d+)(.*)$/);
  const endValue = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  const spring = useSpring(0, { bounce: 0, duration: 2500 });
  const display = useTransform(spring, (current) => Math.floor(current));

  useEffect(() => {
    if (isInView && endValue > 0) {
      spring.set(endValue);
    }
  }, [isInView, endValue, spring]);

  if (!numericMatch) return <span>{value}</span>;

  return (
    <span ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const FALLBACK_LOGO = '/LWT_logo.png';

/* ── Component ────────────────────────────────────────────────────────────── */

export function EditionHero({
  editionNumber,
  year,
  themeName,
  description,
  galleryImages,
  stats,
  logoUrl,
}: EditionHeroProps) {
  return (
    <section 
      className="relative w-full overflow-hidden bg-cover bg-center bg-no-repeat noise-texture"
      style={{ backgroundImage: "url('/section2_background.png')" }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />

      <div className="relative z-10 mx-auto max-w-[90rem] px-6 pt-28 pb-20 md:pt-36 md:pb-28">

        {/* ── Header: Title + Logo ─────────────────── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12 mb-14">
          <ScrollReveal className="flex-1">
            <div className="relative inline-block border-[9px] border-[var(--rbs-green)] px-8 py-4">
              <h1
                className="text-dj-gross text-[clamp(3rem,8vw,6rem)] leading-[0.92] uppercase text-white"
                style={{ textShadow: '0px 4px 4px rgba(0,0,0,0.25)' }}
              >
                LAST WALL TOUR
                <br />
                FESTIVAL
              </h1>
            </div>
          </ScrollReveal>

          <ScrollReveal from="right" delay={0.15} className="flex-shrink-0 lg:mt-4">
            <div className="relative w-[180px] h-[200px] sm:w-[220px] sm:h-[244px]">
              <Image
                src={logoUrl ?? FALLBACK_LOGO}
                alt="Last Wall Tour"
                fill
                sizes="220px"
                className="object-contain"
              />
            </div>
          </ScrollReveal>
        </div>

        {/* ── Description ──────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <p className="max-w-[927px] text-lg sm:text-xl md:text-2xl leading-relaxed text-white/85 tracking-[0.02em] mb-16 text-balance">
            {description}
          </p>
        </ScrollReveal>

        {/* ── Edition Callout ──────────────────────── */}
        <ScrollReveal delay={0.2}>
          <h2
            className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.92] uppercase text-[var(--rbs-red)] mb-2"
            style={{ textShadow: '0 0 40px oklch(0.52 0.20 18 / 25%)' }}
          >
            {ordinal(editionNumber)} EDITION {year}
          </h2>
          <p
            className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.92] uppercase ml-auto max-w-fit"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1.5px oklch(1 0 0 / 70%)',
            }}
          >
            {themeName}
          </p>
        </ScrollReveal>

        {/* ── Gallery: Masonry grid ─────────────────── */}
        <div className=" mb-20 w-[75%] h-[655px] ml-auto">
          <StaggerReveal>
            {/* Previous edition marker */}
            <div className="relative mb-4 ml-[clamp(1rem,4vw,4rem)]">
              <StaggerItem>
                <span
                  className="font-display text-[clamp(3rem,5vw,4rem)] leading-none uppercase select-none"
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: '1px oklch(1 0 0 / 40%)',
                  }}
                >
                  {ordinal(editionNumber)}
                </span>
              </StaggerItem>
            </div>

            {/* Row 1: 65% / 35% */}
            <div className="flex flex-col sm:flex-row gap-[16px] mb-[16px]">
              <StaggerItem className="sm:w-[654px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[0]}
                    alt={`${themeName} — fresque 1`}
                    fill
                    sizes="(max-width: 640px) 100vw, 65vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
              <StaggerItem className="sm:w-[442px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[4]}
                    alt={`${themeName} — fresque 2`}
                    fill
                    sizes="(max-width: 640px) 100vw, 35vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
            </div>

            {/* Row 2: 40% / 60%, shifted left */}
            <div className="flex flex-col sm:flex-row gap-[16px] mb-[16px] sm:-translate-x-[33%]">
              <StaggerItem className="sm:w-[442px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[5]}
                    alt={`${themeName} — fresque 3`}
                    fill
                    sizes="(max-width: 640px) 100vw, 46vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
              <StaggerItem className="sm:w-[654px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[1]}
                    alt={`${themeName} — fresque 4`}
                    fill
                    sizes="(max-width: 640px) 100vw, 69vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
            </div>

            {/* Row 3: 67% / 33% */}
            <div className="flex flex-col sm:flex-row gap-[16px]">
              <StaggerItem className="sm:w-[654px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[2]}
                    alt={`${themeName} — fresque 5`}
                    fill
                    sizes="(max-width: 640px) 100vw, 67vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
              <StaggerItem className="sm:w-[442px]">
                <div className="relative h-[196px] w-full overflow-hidden bg-black/40">
                  <Image
                    src={galleryImages[3]}
                    alt={`${themeName} — fresque 6`}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover grayscale-[0.3] hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                </div>
              </StaggerItem>
            </div>
          </StaggerReveal>
        </div>

        {/* ── Stats Row ──────────────────────────────── */}
        <StaggerReveal className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="stat-card text-center">
                <p className="font-display text-[clamp(2rem,4vw,2.5rem)] leading-none text-white">
                  <StatCountUp value={stat.value} />
                </p>
                <p className="text-sm sm:text-base text-white/55 uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
