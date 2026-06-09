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

    /* Parallax depth per image: left and right aligned, center moves opposite */
    const offsets = [-8, 10, -8]; // yPercent per image

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
      className="relative w-full overflow-hidden border-t border-white/10 bg-transparent noise-texture"
    >
      <div className="relative mx-auto max-w-[90rem] px-6 py-20 md:py-28">

        {/* ── Outlined mega title ────────────────────── */}
        <ScrollReveal>
          <h2
            className="text-dj-gross text-[clamp(3rem,8vw,6rem)] leading-[0.9] uppercase tracking-tighter select-none"
            style={{
              WebkitTextStroke: '2px rgba(230, 243, 1, 0.95)',
              color: 'transparent',
              filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 8px var(--rbs-gold)) drop-shadow(0 0 20px var(--rbs-gold))',
            }}
          >
            {title}
          </h2>
        </ScrollReveal>

        {/* ── Images Row ──────────────────────────── */}
        <div className="relative w-full mt-10 md:mt-14 mb-12 md:mb-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 w-full">

            {/* Left image */}
            <ScrollReveal from="bottom" delay={0.1} className="w-full max-w-[259px] shrink-0 z-10 relative">
              <div
                ref={(el) => { imgRefs.current[0] = el; }}
                className="relative mx-auto w-full aspect-[259/468]"
              >
                <div className="relative w-full h-full overflow-hidden rounded-lg ">
                  <Image
                    src={images[0]}
                    alt={`${title} - left`}
                    fill
                    sizes="(max-width: 768px) 90vw, 259px"
                    className="object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Center image */}
            <ScrollReveal from="bottom" delay={0.2} className="w-full max-w-[342px] shrink-0 z-20 relative md:-mx-[1.5%]">
              <div className="w-full h-full md:-translate-y-[10%]">
                <div
                  ref={(el) => { imgRefs.current[1] = el; }}
                  className="relative mx-auto w-full aspect-[342/484] mt-4 md:mt-0"
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg ">
                    <Image
                      src={images[1]}
                      alt={`${title} - central`}
                      fill
                      sizes="(max-width: 768px) 90vw, 342px"
                      className="object-cover"
                    />
                  </div>

                  {/* Scotch tapes at the corners */}
                  {/* Top-Left */}
                  <img
                    src="/top_left__bottom_right_scotch.png"
                    alt=""
                    className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-[28%] h-auto pointer-events-none z-30 select-none"
                  />
                  {/* Top-Right */}
                  <img
                    src="/top_right_bottom_left.png"
                    alt=""
                    className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-[20%] h-auto pointer-events-none z-30 select-none"
                  />
                  {/* Bottom-Left */}
                  <img
                    src="/top_right_bottom_left.png"
                    alt=""
                    className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 w-[20%] h-auto pointer-events-none z-30 select-none"
                  />
                  {/* Bottom-Right */}
                  <img
                    src="/top_left__bottom_right_scotch.png"
                    alt=""
                    className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[28%] h-auto pointer-events-none z-30 select-none"
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Right image */}
            <ScrollReveal from="bottom" delay={0.3} className="w-full max-w-[500px] shrink-0 z-10 relative">
              <div
                ref={(el) => { imgRefs.current[2] = el; }}
                className="relative mx-auto w-full aspect-[500/468] mt-4 md:mt-0"
              >
                <div className="relative w-full h-full overflow-hidden rounded-lg ">
                  <Image
                    src={images[2]}
                    alt={`${title} - right`}
                    fill
                    sizes="(max-width: 768px) 90vw, 500px"
                    className="object-cover"
                  />
                </div>

                {/* RBS Akademya Logo */}
                <img
                  src="/logo_rbs_akademya.png"
                  alt="RBS Akademya Logo"
                  className="absolute top-0 right-[5%] -translate-y-1/2 w-[70%] h-auto pointer-events-none z-20 select-none"
                />
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
