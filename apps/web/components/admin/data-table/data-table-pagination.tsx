'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginatedMeta } from '@/types/admin';

interface DataTablePaginationProps {
  pagination: PaginatedMeta;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({ pagination, onPageChange }: DataTablePaginationProps) {
  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-1 text-sm text-white/50">
      <p>
        {start}–{end} sur {total} résultat{total > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-1 rounded-md bg-white/5 text-white/70 text-xs min-w-[80px] text-center">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
