'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import type { AdminTag } from '@/types/admin';

export function getTagColumns(onDelete: (id: string) => void): ColumnDef<AdminTag>[] {
  return [
    {
      id: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <span className="font-medium text-white">
          {row.original.translations.find((t) => t.locale === 'fr')?.title ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions id={row.original.id} basePath="/admin/tags" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
