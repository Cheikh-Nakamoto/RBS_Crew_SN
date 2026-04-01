import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  titleClassName?: string;
}

/**
 * Reusable section header component with optional eyebrow tag,
 * gradient accent line, and subtitle.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  centered = false,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && 'text-center', className)}>
      {eyebrow && (
        <div className={cn('flex items-center gap-3 mb-3', centered && 'justify-center')}>
          {!centered && (
            <span className="w-6 h-0.5 bg-gradient-to-r from-[oklch(0.72_0.19_48)] to-[oklch(0.60_0.25_345)] rounded-full flex-shrink-0" />
          )}
          <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.72_0.19_48)]">
            {eyebrow}
          </span>
          {centered && (
            <span className="w-6 h-0.5 bg-gradient-to-r from-[oklch(0.72_0.19_48)] to-[oklch(0.60_0.25_345)] rounded-full flex-shrink-0" />
          )}
        </div>
      )}
      <h2
        className={cn(
          'font-display text-4xl sm:text-5xl text-white leading-tight',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-3 text-white/50 text-lg leading-relaxed', centered && 'max-w-2xl mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
