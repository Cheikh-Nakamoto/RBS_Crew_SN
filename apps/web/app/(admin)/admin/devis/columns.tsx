'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { QUOTE_STATUS_META } from '@/lib/admin/status-maps';
import type { AdminQuote } from '@/types/admin';

export function getQuoteColumns(onDelete: (id: string) => void): ColumnDef<AdminQuote>[] {
  return [
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-white">{row.original.name}</p>
          <p className="text-xs text-white/40">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'message',
      header: 'Message',
      meta: { priority: 2 },
      cell: ({ row }) => (
        <p className="text-sm text-white/60 truncate max-w-xs">{row.original.message}</p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const meta = QUOTE_STATUS_META[row.original.status];
        return <Badge variant="outline" className={meta?.className}>{meta?.label}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      meta: { priority: 3 },
      cell: ({ row }) => (
        <span className="text-xs text-white/40">
          {new Date(row.original.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions id={row.original.id} basePath="/admin/devis" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
