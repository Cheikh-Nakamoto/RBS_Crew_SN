'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

// Framer Motion v12 — ease doit être un tuple typé, pas number[]
const EASE_SPRING = [0.34, 1.1, 0.64, 1] as [number, number, number, number];
const EASE_OUT    = [0, 0, 0.2, 1]       as [number, number, number, number];

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly from?: 'bottom' | 'left' | 'right' | 'none';
  readonly once?: boolean;
  readonly amount?: number;
}

const directionOffset = {
  bottom: { y: 40, x: 0 },
  left:   { y: 0,  x: -40 },
  right:  { y: 0,  x: 40 },
  none:   { y: 0,  x: 0 },
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  from = 'bottom',
  once = true,
  amount = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });
  const offset = directionOffset[from];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...offset, filter: 'blur(4px)' }}
      animate={
        isInView
          ? { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }
          : { opacity: 0, ...offset, filter: 'blur(4px)' }
      }
      transition={{ duration: 0.65, delay, ease: EASE_SPRING }}
    >
      {children}
    </motion.div>
  );
}

/* ── StaggerReveal ─────────────────────────────── */

interface StaggerRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly staggerDelay?: number;
  readonly once?: boolean;
}


export const staggerChildVariants: Variants = {
  hidden:  { opacity: 0, y: 32, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

export function StaggerReveal({
  children,
  className,
  staggerDelay = 0.08,
  once = true,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.1 });

  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: staggerDelay } },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: unknown }) {
  return (
    <motion.div className={className} variants={staggerChildVariants} {...props}>
      {children}
    </motion.div>
  );
}
