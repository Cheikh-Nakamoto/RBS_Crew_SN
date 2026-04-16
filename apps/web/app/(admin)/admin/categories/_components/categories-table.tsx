'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deleteCategory } from '../actions';
import type { AdminCategory, PaginatedMeta } from '@/types/admin';

function getName(entity: AdminCategory): string {
  return entity.translations.find((t) => t.locale === 'fr')?.title ?? entity.translations[0]?.title ?? '—';
}

function getColumns(onDelete: (id: string) => void): ColumnDef<AdminCategory>[] {
  return [
    {
      id: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <span className="font-medium text-white">{getName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'parentId',
      header: 'Catégorie parente',
      cell: ({ row }) => (
        <span className="text-sm text-white/40">{row.original.parentId ? 'Oui' : '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Créée le',
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
        <DataTableRowActions id={row.original.id} basePath="/admin/categories" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}

export function CategoriesTable({ data, pagination }: { data: AdminCategory[]; pagination: PaginatedMeta }) {
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
        const result = await deleteCategory(deleteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Catégorie supprimée');
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher une catégorie..." />
        <DataTable columns={getColumns(setDeleteId)} data={data} pagination={pagination} onPageChange={handlePageChange} />
      </div>
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Supprimer cette catégorie ?"
      />
    </>
  );
}
