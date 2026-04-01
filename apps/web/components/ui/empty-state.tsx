import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  message?: string;
  className?: string;
}

/**
 * Empty state shown when a list returns no results
 */
export function EmptyState({
  title = 'Aucun résultat',
  message = 'Il n\'y a rien à afficher pour le moment.',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-4 text-center',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
        <SearchX className="w-7 h-7 text-white/30" />
      </div>
      <h3 className="font-display text-xl text-white mb-2">{title}</h3>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
