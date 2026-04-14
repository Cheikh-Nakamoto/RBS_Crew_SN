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
import { deleteQuote } from '../actions';
import type { AdminQuote, PaginatedMeta } from '@/types/admin';

const STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: 'Nouveau', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  IN_REVIEW: { label: 'En cours', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ANSWERED: { label: 'Répondu', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const columns = (onDelete: (id: string) => void): ColumnDef<AdminQuote>[] => [
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
    cell: ({ row }) => (
      <p className="text-sm text-white/60 truncate max-w-xs">{row.original.message}</p>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const meta = STATUS_META[row.original.status];
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
        basePath="/admin/devis"
        onDelete={onDelete}
        viewable={true}
      />
    ),
    size: 48,
  },
];

interface QuotesTableProps {
  data: AdminQuote[];
  pagination: PaginatedMeta;
}

export function QuotesTable({ data, pagination }: QuotesTableProps) {
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
        await deleteQuote(deleteId);
        toast.success('Devis supprimé');
        setDeleteId(null);
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher un devis..." />
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
        title="Supprimer ce devis ?"
        description="Ce devis sera définitivement supprimé."
      />
    </>
  );
}
