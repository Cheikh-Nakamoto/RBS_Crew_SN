'use client';

import * as React from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/* ── Types ─────────────────────────────────────── */

interface Trend {
  value: number;
  label?: string;
}

type StatVariant = 'default' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  description?: string;
  trend?: Trend;
  variant?: StatVariant;
  prefix?: string;
  suffix?: string;
  /** Animate numeric value on mount */
  animated?: boolean;
  className?: string;
}

/* ── Variant config ─────────────────────────────── */

const variantConfig: Record<
  StatVariant,
  { iconBg: string; iconColor: string; accentLine: string }
> = {
  default: {
    iconBg:    'bg-[var(--rbs-red)]/15',
    iconColor: 'text-[var(--rbs-red)]',
    accentLine: 'bg-[var(--rbs-red)]',
  },
  success: {
    iconBg:    'bg-[var(--rbs-green)]/15',
    iconColor: 'text-[var(--rbs-green-light)]',
    accentLine: 'bg-[var(--rbs-green)]',
  },
  warning: {
    iconBg:    'bg-orange-500/15',
    iconColor: 'text-orange-400',
    accentLine: 'bg-orange-500',
  },
  danger: {
    iconBg:    'bg-red-500/15',
    iconColor: 'text-red-400',
    accentLine: 'bg-red-500',
  },
};

/* ── CountUp hook ───────────────────────────────── */

function useCountUp(target: number, enabled: boolean) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString('fr-FR'));

  React.useEffect(() => {
    if (!enabled) return;
    const controls = animate(motionVal, target, {
      duration: 1.2,
      ease: [0, 0, 0.2, 1],
      delay: 0.15,
    });
    return controls.stop;
  }, [target, enabled, motionVal]);

  return rounded;
}

/* ── Component ──────────────────────────────────── */

export function StatCard({
  label,
  value,
  icon,
  description,
  trend,
  variant = 'default',
  prefix,
  suffix,
  animated = true,
  className,
}: StatCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const isNumeric = typeof value === 'number';
  const countValue = useCountUp(isNumeric ? value : 0, animated && isNumeric && isInView);

  const cfg = variantConfig[variant];
  const trendPositive = (trend?.value ?? 0) > 0;
  const trendNeutral = (trend?.value ?? 0) === 0;
  const TrendIcon = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm',
        'hover:border-white/20 transition-colors duration-300',
        className
      )}
    >
      {/* Accent line top */}
      <div
        className={cn('absolute top-0 left-0 right-0 h-[2px]', cfg.accentLine)}
        style={{ opacity: 0.6 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 text-balance">
          {label}
        </p>
        {icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', cfg.iconBg, cfg.iconColor)}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-1 mb-1">
        {prefix && (
          <span className="text-sm text-white/50 mb-1">{prefix}</span>
        )}
        <motion.p
          className="text-3xl font-black text-white tracking-tight leading-none animate-count-up"
          aria-label={`${label}: ${typeof value === 'number' ? value.toLocaleString('fr-FR') : value}`}
        >
          {animated && isNumeric && isInView ? (
            <motion.span>{countValue}</motion.span>
          ) : (
            typeof value === 'number' ? value.toLocaleString('fr-FR') : value
          )}
        </motion.p>
        {suffix && (
          <span className="text-sm text-white/50 mb-1">{suffix}</span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-white/40 mt-1">{description}</p>
      )}

      {/* Trend */}
      {trend && (
        <div
          className={cn(
            'mt-3 flex items-center gap-1.5 text-xs font-semibold',
            trendNeutral
              ? 'text-white/40'
              : trendPositive
              ? 'text-[var(--rbs-green-light)]'
              : 'text-red-400'
          )}
          aria-label={`Tendance: ${trendPositive ? '+' : ''}${trend.value}%${trend.label ? ' ' + trend.label : ''}`}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {trendPositive && '+'}
            {trend.value}%{trend.label ? ` ${trend.label}` : ''}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Skeleton ───────────────────────────────────── */

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/3 p-5 animate-pulse',
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-28 bg-white/10 rounded" />
        <div className="h-9 w-9 bg-white/8 rounded-lg" />
      </div>
      <div className="h-9 w-20 bg-white/15 rounded-md mb-1" />
      <div className="h-3 w-24 bg-white/8 rounded mt-1" />
    </div>
  );
}
