'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

const EASE_SPRING = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ── Variants ──────────────────────────────────── */

const cardVariants = cva(
  'group/card flex flex-col gap-4 overflow-hidden rounded-xl text-sm text-card-foreground ring-1 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
  {
    variants: {
      variant: {
        default:
          'bg-card ring-foreground/10 py-4 data-[size=sm]:gap-3 data-[size=sm]:py-3',
        glass: [
          'bg-white/5 ring-white/10 py-4',
          'backdrop-filter backdrop-blur-xl',
          'data-[size=sm]:gap-3 data-[size=sm]:py-3',
        ].join(' '),
        glow: [
          'bg-card ring-[var(--rbs-red)]/20 py-4',
          'shadow-[0_0_20px_oklch(0.52_0.20_18/0.08)]',
          'hover:ring-[var(--rbs-red)]/40 hover:shadow-[var(--shadow-glow-red)]',
          'transition-[box-shadow,ring-color] duration-300',
          'data-[size=sm]:gap-3 data-[size=sm]:py-3',
        ].join(' '),
        featured: [
          'bg-gradient-to-br from-[oklch(0.14_0.020_18)] to-[oklch(0.10_0.008_240)]',
          'ring-[var(--rbs-red)]/30 py-4',
          'shadow-[inset_0_1px_0_oklch(1_0_0/8%),0_0_40px_oklch(0.52_0.20_18/0.12)]',
          'data-[size=sm]:gap-3 data-[size=sm]:py-3',
        ].join(' '),
      },
      size: {
        default: '',
        sm: '',
      },
      hoverable: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      hoverable: false,
    },
  }
);

/* ── Card ──────────────────────────────────────── */

interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'children'>,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
}

function Card({
  className,
  variant = 'default',
  size = 'default',
  hoverable,
  ...props
}: CardProps) {
  const hoverAnimation = hoverable
    ? { whileHover: { y: -4, transition: { duration: 0.25, ease: EASE_SPRING } } }
    : {};

  return (
    <motion.div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ variant, size, hoverable, className }))}
      {...hoverAnimation}
      {...props}
    />
  );
}

/* ── CardHeader ────────────────────────────────── */

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4',
        'group-data-[size=sm]/card:px-3',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        'has-data-[slot=card-description]:grid-rows-[auto_auto]',
        '[.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
        className
      )}
      {...props}
    />
  );
}

/* ── CardTitle ─────────────────────────────────── */

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className
      )}
      {...props}
    />
  );
}

/* ── CardDescription ───────────────────────────── */

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/* ── CardAction ────────────────────────────────── */

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

/* ── CardContent ───────────────────────────────── */

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4 group-data-[size=sm]/card:px-3', className)}
      {...props}
    />
  );
}

/* ── CardFooter ────────────────────────────────── */

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3',
        className
      )}
      {...props}
    />
  );
}

/* ── CardSkeleton ──────────────────────────────── */

interface CardSkeletonProps {
  className?: string;
  lines?: number;
  hasImage?: boolean;
}

function CardSkeleton({ className, lines = 3, hasImage = false }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/8 bg-white/3 overflow-hidden animate-pulse',
        className
      )}
      aria-hidden="true"
      aria-label="Chargement…"
    >
      {hasImage && <div className="h-48 bg-white/6" />}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded-md w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-white/6 rounded-md"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardSkeleton,
};
