'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  className?: string;
}

/**
 * Friendly error state shown when an API call fails
 */
export function ErrorState({
  title = 'Impossible de charger les données',
  message = 'Le service est momentanément inaccessible. Veuillez réessayer.',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-4 text-center',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="font-display text-xl text-white mb-2">{title}</h3>
      <p className="text-white/45 text-sm max-w-xs leading-relaxed mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/8 border border-white/12 text-sm text-white/70 hover:text-white hover:bg-white/12 transition-all duration-200"
      >
        <RefreshCcw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  );
}
