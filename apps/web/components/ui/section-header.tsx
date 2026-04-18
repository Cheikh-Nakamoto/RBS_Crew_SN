import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  titleClassName?: string;
  /** Heading level — use h1 when this is the first/main page heading. Defaults to h2. */
  as?: 'h1' | 'h2';
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  centered = false,
  titleClassName,
  as: Heading = 'h1',
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && 'text-center', className)}>
      {eyebrow && (
        <div className={cn('flex items-center gap-3 mb-3', centered && 'justify-center')}>
          {!centered && (
            <span className="w-6 h-0.5 bg-gradient-to-r from-[var(--rbs-gold)] to-[var(--rbs-red)] rounded-full flex-shrink-0" />
          )}
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--rbs-gold)]">
            {eyebrow}
          </span>
          {centered && (
            <span className="w-6 h-0.5 bg-gradient-to-r from-[var(--rbs-gold)] to-[var(--rbs-red)] rounded-full flex-shrink-0" />
          )}
        </div>
      )}
      <Heading
        className={cn(
          'font-display text-4xl sm:text-5xl text-white leading-tight tracking-tight',
          titleClassName,
        )}
      >
        {title}
      </Heading>
      {subtitle && (
        <p className={cn('mt-3 text-white/65 text-base sm:text-lg leading-relaxed', centered && 'max-w-2xl mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
