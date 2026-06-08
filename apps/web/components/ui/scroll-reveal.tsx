'use client';

import { useRef, useEffect, useId, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Easings ───────────────────────────────────────────────────────────────── */

const EASE_OUT = 'power3.out';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly from?: 'bottom' | 'left' | 'right' | 'none';
  readonly once?: boolean;
  readonly amount?: number;
}

/* ── Direction offset map ──────────────────────────────────────────────────── */

const directionOffset = {
  bottom: { y: 40, x: 0 },
  left:   { y: 0,  x: -40 },
  right:  { y: 0,  x: 40 },
  none:   { y: 0,  x: 0 },
};

/* ── ScrollReveal ──────────────────────────────────────────────────────────── */

export function ScrollReveal({
  children,
  className,
  delay = 0,
  from = 'bottom',
  once = true,
  amount = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const offset = directionOffset[from];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, ...offset, filter: 'blur(4px)' },
        {
          opacity: 1,
          y: 0,
          x: 0,
          filter: 'blur(0px)',
          duration: 0.65,
          delay,
          ease: EASE_OUT,
          scrollTrigger: {
            id,
            trigger: el,
            start: `top ${100 - amount * 100}%`,
            toggleActions: once ? 'play none none none' : 'play none none reset',
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [delay, from, once, amount, id]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── StaggerReveal ─────────────────────────────────────────────────────────── */

interface StaggerRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly staggerDelay?: number;
  readonly once?: boolean;
}

export function StaggerReveal({
  children,
  className,
  staggerDelay = 0.08,
  once = true,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.children;
    if (!children.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: 32, filter: 'blur(4px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.55,
          stagger: staggerDelay,
          ease: 'power2.out',
          scrollTrigger: {
            id,
            trigger: el,
            start: 'top 90%',
            toggleActions: once ? 'play none none none' : 'play none none reset',
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [staggerDelay, once, id]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── StaggerItem (passive wrapper — no GSAP needed) ────────────────────────── */

interface StaggerItemProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly [key: string]: unknown;
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
