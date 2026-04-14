'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deletePresse } from '../actions';
import type { AdminPressMention, PaginatedMeta } from '@/types/admin';

const columns = (onDelete: (id: string) => void): ColumnDef<AdminPressMention>[] => [
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

export function PresseTable({ data, pagination }: { data: AdminPressMention[]; pagination: PaginatedMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const handlePageChange = (page: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(page));
    router.push(`${pathname}?${p.toString()}`);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startDeleting(async () => {
      try {
        await deletePresse(deleteId);
        toast.success('Mention supprimée');
        setDeleteId(null);
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher une mention presse..." />
        <DataTable columns={columns(setDeleteId)} data={data} pagination={pagination} onPageChange={handlePageChange} />
      </div>
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Supprimer cette mention ?"
      />
    </>
  );
}
