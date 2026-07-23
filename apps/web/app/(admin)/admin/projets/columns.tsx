'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MapPin } from 'lucide-react';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProjetColumns(onDelete: (id: string) => void): ColumnDef<any>[] {
  return [
    {
      id: 'name',
      header: 'Titre',
      cell: ({ row }) => (
        <span className="font-medium text-white">
          {row.original.translations?.find((t: { locale: string }) => t.locale === 'fr')?.title ?? '—'}
        </span>
      ),
    },
    {
      id: 'country',
      header: 'Localisation',
      meta: { priority: 2 },
      cell: ({ row }) =>
        row.original.country ? (
          <span className="flex items-center gap-1.5 text-sm text-white/60">
            <MapPin className="w-3.5 h-3.5 text-[var(--rbs-red)]" />
            {row.original.country}
          </span>
        ) : (
          <span className="text-white/20">—</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions id={row.original.id} basePath="/admin/projets" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
