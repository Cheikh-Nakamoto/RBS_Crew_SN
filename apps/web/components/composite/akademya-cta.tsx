'use client';

import { useRef, useEffect, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

gsap.registerPlugin(ScrollTrigger);

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface AkademyaCTAProps {
  title: string;
  description: string;
  /** 3 images for the layered collage */
  images: string[];
  logoUrl?: string;
  cta: { label: string; href: string };
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function AkademyaCTA({
  title,
  description,
  images,
  logoUrl,
  cta,
}: AkademyaCTAProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();

  /* ── Parallax on collage images ─────────────── */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const imgs = imgRefs.current.filter(Boolean) as HTMLDivElement[];

    /* Parallax depth per image: main subtle, secondary & tertiary more */
    const offsets = [-6, 10, -12]; // yPercent per image

    const ctx = gsap.context(() => {
      imgs.forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: 0 },
          {
            yPercent: offsets[i] ?? 0,
            ease: 'none',
            scrollTrigger: {
              id: `${id}-parallax-${i}`,
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [id]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden border-t border-white/10 bg-[var(--bg-page)] noise-texture"
    >
      <div className="relative mx-auto max-w-[90rem] px-6 py-20 md:py-28">

        {/* ── Outlined mega title ────────────────────── */}
        <ScrollReveal>
          <h2
            className="font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] uppercase tracking-tighter select-none"
            style={{
              WebkitTextStroke: '2px rgba(255,255,255,0.7)',
              color: 'transparent',
            }}
          >
            {title}
          </h2>
        </ScrollReveal>

        {/* ── Image collage ──────────────────────────── */}
        <div className="relative w-full mt-10 md:mt-14 mb-12 md:mb-16">
          <div className="flex flex-col md:block md:relative md:h-[500px]">

            {/* Main image — centered, slightly rotated */}
            <ScrollReveal from="left" delay={0.1}>
              <div
                ref={(el) => { imgRefs.current[0] = el; }}
                className="relative mx-auto md:absolute md:left-[8%] md:top-1/2 md:-translate-y-1/2 z-20 w-[min(90vw,400px)] md:w-[clamp(280px,34vw,400px)] aspect-[3/4] shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={images[0]}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 90vw, 400px"
                    className="object-cover"
                    style={{ transform: 'rotate(-0.2deg) scale(1.05)' }}
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Secondary image — right, overlapping */}
            <ScrollReveal from="right" delay={0.2}>
              <div
                ref={(el) => { imgRefs.current[1] = el; }}
                className="relative mx-auto md:absolute md:right-[5%] md:top-[5%] z-10 w-[min(85vw,380px)] md:w-[clamp(260px,32vw,380px)] aspect-[4/3] shadow-[0_4px_20px_rgba(0,0,0,0.5)] mt-4 md:mt-0"
              >
                <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={images[1]}
                    alt={`${title} - atelier`}
                    fill
                    sizes="(max-width: 768px) 85vw, 380px"
                    className="object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Tertiary image — bottom, wider */}
            <ScrollReveal from="bottom" delay={0.3}>
              <div
                ref={(el) => { imgRefs.current[2] = el; }}
                className="relative mx-auto md:absolute md:left-[20%] md:bottom-0 z-10 w-[min(80vw,500px)] md:w-[clamp(320px,40vw,500px)] aspect-[16/9] shadow-[0_4px_20px_rgba(0,0,0,0.5)] mt-4 md:mt-0"
              >
                <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={images[2]}
                    alt={`${title} - workshop`}
                    fill
                    sizes="(max-width: 768px) 80vw, 500px"
                    className="object-cover"
                  />
                  {/* Play overlay hint */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white/80 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* ── Bottom row: description + CTA + logo ───── */}
        <ScrollReveal delay={0.4}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-10">
            {/* Description */}
            <div className="max-w-lg">
              <p className="text-white/60 text-sm md:text-base leading-relaxed">
                {description}
              </p>
            </div>

            {/* CTA button */}
            <Link
              href={cta.href}
              className="inline-flex items-center gap-3 min-h-[44px] px-6 py-3 rounded-lg bg-[var(--rbs-red)] hover:bg-[var(--rbs-red-light)] text-white text-sm font-semibold uppercase tracking-wider transition-all hover:shadow-[0_0_24px_oklch(0.52_0.20_18/0.45)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-red)]/60 shrink-0"
            >
              {cta.label} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            {/* Logo badge */}
            {logoUrl && (
              <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 ml-auto md:ml-0">
                <Image
                  src={logoUrl}
                  alt={`${title} logo`}
                  fill
                  sizes="96px"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
