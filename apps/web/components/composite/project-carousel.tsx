'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface CarouselProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  images: string[];
  clientName?: string;
}

export interface ProjectCarouselProps {
  projects: CarouselProject[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

/* ── Constants ────────────────────────────────────────────────────────────── */

const CARD_CENTER = { width: 737, height: 390 };

/* ── Easing ───────────────────────────────────────────────────────────────── */

const SLIDE_EASE = 'power3.out';
const COOLDOWN_MS = 800;

/* ── Card positions ───────────────────────────────────────────────────────── */

const cardTargets = {
  left:   { xPercent: -50, yPercent: 0, scale: 0.75, opacity: 0.65, filter: 'brightness(0.7) blur(1px)', zIndex: 10 },
  center: { xPercent: 0,   yPercent: 0,  scale: 1,    opacity: 1,    filter: 'brightness(1) blur(0px)',    zIndex: 30 },
  right:  { xPercent: 50,  yPercent: 0, scale: 0.75, opacity: 0.65, filter: 'brightness(0.7) blur(1px)', zIndex: 10 },
  hidden: { xPercent: 0,   yPercent: 0,  scale: 0.55, opacity: 0,    filter: 'brightness(0.5) blur(3px)', zIndex: 0 },
};


/* ── Helpers ──────────────────────────────────────────────────────────────── */

function positionForIndex(
  i: number,
  active: number,
  total: number,
): 'left' | 'center' | 'right' | 'hidden' {
  if (total <= 1) return i === active ? 'center' : 'hidden';
  const leftOf = (active - 1 + total) % total;
  const rightOf = (active + 1) % total;
  if (i === active) return 'center';
  if (i === leftOf) return 'left';
  if (i === rightOf) return 'right';
  return 'hidden';
}

/* ── Slideshow ────────────────────────────────────────────────────────────── */

function CardImageSlideshow({
  images,
  alt,
  isActive,
}: {
  images: string[];
  alt: string;
  isActive: boolean;
}) {
  const [slide, setSlide] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* slide rotation */
  useEffect(() => {
    if (!isActive || images.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % images.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, images.length]);

  /* crossfade on slide change */
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, scale: 1.05 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.inOut' },
    );

    return () => {
      tween.kill();
    };
  }, [slide]);

  if (!images.length) {
    return (
      <div className="absolute inset-0 bg-[#e5e5e5] flex items-center justify-center">
        <span className="text-black/20 text-sm">Aucune image</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={imgRef} className="absolute inset-0">
        <Image
          src={images[slide]}
          alt={`${alt} ${slide + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 737px"
          className="object-cover"
          priority={slide === 0}
        />
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function ProjectCarousel({
  projects,
  primaryCta,
  secondaryCta,
}: ProjectCarouselProps) {
  const [active, setActive] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const total = projects.length;

  const isFirstRender = useRef(true);

  /* ── Card position animation ────────────────── */
  useEffect(() => {
    projects.forEach((project, i) => {
      const el = cardRefs.current.get(project.id);
      if (!el) return;

      const pos = positionForIndex(i, active, total);
      const target = cardTargets[pos];

      if (isFirstRender.current) {
        gsap.set(el, target);
      } else {
        gsap.to(el, {
          ...target,
          duration: 1.2,
          ease: SLIDE_EASE,
        });
      }
    });

    isFirstRender.current = false;
  }, [active, projects, total]);

  /* ── Start cooldown after each navigation ──── */
  const startCooldown = useCallback(() => {
    setIsTransitioning(true);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      setIsTransitioning(false);
    }, COOLDOWN_MS);
  }, []);

  /* ── Click handler ──────────────────────────── */
  const handleSideClick = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setActive(index);
      startCooldown();
    },
    [isTransitioning, startCooldown],
  );

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  /* ── Set card ref ───────────────────────────── */
  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  if (!projects.length) return null;

  return (
    <section className="relative w-full overflow-hidden bg-white">
      <div className="relative mx-auto max-w-[90rem] px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* ── Carousel track ────────────────────────── */}
        <div className="relative w-full mt-44 md:mt-52" style={{ height: CARD_CENTER.height + 24 }}>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-[737px] h-full pointer-events-none">
            {projects.map((project, i) => {
              const pos = positionForIndex(i, active, total);
              const isSide = pos === 'left' || pos === 'right';

              return (
                <div
                  key={project.id}
                  ref={(el) => setCardRef(project.id, el)}
                  className={`absolute left-0 top-0 w-full h-full ${
                    isSide && !isTransitioning
                      ? 'pointer-events-auto cursor-pointer'
                      : 'pointer-events-none'
                  }`}
                  style={{ maxWidth: CARD_CENTER.width }}
                  onClick={() => isSide && handleSideClick(i)}
                >
                  {/* Integrated Header */}
                  <div
                    className={`absolute bottom-[100%] left-0 w-full mb-8 md:mb-10 transition-opacity duration-[800ms] ease-out ${
                      pos === 'center' ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <h2 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] text-black mb-4">
                      {project.title}
                    </h2>
                    <p className="max-w-[908px] text-[16px] leading-[22px] text-black/65 tracking-[1.28px]">
                      {project.summary}
                    </p>
                  </div>

                  <div className="relative w-full h-full rounded-[60px] overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.12)]">
                    <CardImageSlideshow
                      images={project.images}
                      alt={project.title}
                      isActive={pos === 'center'}
                    />

                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent pointer-events-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTAs ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-10 mt-14">
          <Link
            href={primaryCta.href}
            className="text-[clamp(1.75rem,4vw,3rem)] font-display uppercase text-black hover:text-black/60 transition-colors leading-none tracking-tight"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="text-[clamp(1.25rem,3vw,2.25rem)] font-display uppercase text-black/45 hover:text-black transition-colors leading-none tracking-tight"
          >
            {secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
