'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCallback, useTransition } from 'react';

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar({ searchPlaceholder = 'Rechercher...', children }: DataTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get('search') ?? '';

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  let debounceTimer: ReturnType<typeof setTimeout>;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => updateSearch(e.target.value), 300);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          defaultValue={search}
          onChange={handleChange}
          placeholder={searchPlaceholder}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-white/30 hover:text-white"
            onClick={() => updateSearch('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {children}
      {isPending && (
        <span className="text-xs text-white/30 animate-pulse">Chargement...</span>
      )}
    </div>
  );
}
