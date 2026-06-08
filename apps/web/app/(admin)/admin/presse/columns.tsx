'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import type { AdminPressMention } from '@/types/admin';

export function getPresseColumns(onDelete: (id: string) => void): ColumnDef<AdminPressMention>[] {
  return [
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => <span className="font-medium text-white">{row.original.source}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Titre',
      cell: ({ row }) => <span className="text-sm text-white/70 truncate max-w-sm block">{row.original.title}</span>,
    },
    {
      accessorKey: 'publishedAt',
      header: 'Publié le',
      cell: ({ row }) => (
        <span className="text-xs text-white/40">
          {row.original.publishedAt ? new Date(row.original.publishedAt).toLocaleDateString('fr-FR') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions id={row.original.id} basePath="/admin/presse" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
