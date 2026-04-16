'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteOrder } from '../actions';
import type { AdminOrder, PaginatedMeta } from '@/types/admin';

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PROCESSING: { label: 'En cours', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  COMPLETED: { label: 'Terminée', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Annulée', className: 'bg-white/10 text-white/40 border-white/20' },
  REFUNDED: { label: 'Remboursée', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  FAILED: { label: 'Échouée', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  UNPAID: { label: 'Non payé', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PAID: { label: 'Payé', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  PARTIALLY_REFUNDED: { label: 'Part. remb.', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  REFUNDED: { label: 'Remboursé', className: 'bg-white/10 text-white/40 border-white/20' },
};

const columns = (onDelete: (id: string) => void): ColumnDef<AdminOrder>[] => [
  {
    accessorKey: 'orderNumber',
    header: 'Numéro',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-white/80">{row.original.orderNumber}</span>
    ),
  },
  {
    id: 'customer',
    header: 'Client',
    cell: ({ row }) => (
      <span className="text-sm text-white/70">{row.original.customerEmail ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-white">{row.original.total.toLocaleString('fr-SN')} FCFA</span>
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
    cell: ({ row }) => {
      const meta = PAYMENT_STATUS_META[row.original.paymentStatus];
      return <Badge variant="outline" className={meta?.className}>{meta?.label}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
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
      <DataTableRowActions
        id={row.original.id}
        basePath="/admin/commandes"
        onDelete={onDelete}
      />
    ),
    size: 48,
  },
];

interface OrdersTableProps {
  data: AdminOrder[];
  pagination: PaginatedMeta;
}

export function OrdersTable({ data, pagination }: OrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startDeleting(async () => {
      try {
        const result = await deleteOrder(deleteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Commande supprimée');
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher une commande..." />
        <DataTable
          columns={columns(setDeleteId)}
          data={data}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Supprimer cette commande ?"
        description="La commande et tous ses articles seront définitivement supprimés."
      />
    </>
  );
}
