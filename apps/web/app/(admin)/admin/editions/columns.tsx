'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEditionColumns(onDelete: (id: string) => void): ColumnDef<any>[] {
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
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions id={row.original.id} basePath="/admin/editions" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
