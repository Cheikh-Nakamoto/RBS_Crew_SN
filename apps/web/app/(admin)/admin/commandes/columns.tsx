'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from '@/lib/admin/status-maps';
import type { AdminOrder } from '@/types/admin';

export function getOrderColumns(onDelete: (id: string) => void): ColumnDef<AdminOrder>[] {
  return [
    {
      accessorKey: 'orderNumber',
      header: 'Numéro',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-white/80">{row.original.orderNumber}</span>
      ),
    },
    {
      accessorKey: 'customerEmail',
      header: 'Client',
      meta: { priority: 2 },
      cell: ({ row }) => <span className="text-sm text-white/60">{row.original.customerEmail || '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      meta: { priority: 2 },
      cell: ({ row }) => (
        <span className="font-mono text-sm text-white/80">{row.original.total.toLocaleString('fr-SN')} FCFA</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const meta = ORDER_STATUS_META[row.original.status];
        return <Badge variant="outline" className={meta?.className}>{meta?.label}</Badge>;
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Paiement',
      meta: { priority: 2 },
      cell: ({ row }) => {
        const meta = PAYMENT_STATUS_META[row.original.paymentStatus];
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
        <DataTableRowActions id={row.original.id} basePath="/admin/commandes" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
