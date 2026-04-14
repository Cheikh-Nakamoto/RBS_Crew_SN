import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface AdminStatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function AdminStatsCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: AdminStatsCardProps) {
  const trendPositive = (trend?.value ?? 0) >= 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--rbs-red)]/15">
          <Icon className="h-4 w-4 text-[var(--rbs-red)]" />
        </div>
      </div>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-white/40">{description}</p>
      )}
      {trend && (
        <p className={cn('mt-2 text-xs font-medium', trendPositive ? 'text-green-400' : 'text-red-400')}>
          {trendPositive ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
