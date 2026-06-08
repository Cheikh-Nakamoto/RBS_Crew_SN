'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteEditions } from '../actions';
import { getEditionColumns } from '../columns';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { PaginatedMeta } from '@/types/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EditionsTableProps {
  data: any[];
  pagination: PaginatedMeta;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EditionsTable({ data, pagination }: EditionsTableProps) {
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
        const result = await deleteEditions(deleteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Édition supprimée');
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher une édition..." />
        <DataTable
          columns={getEditionColumns(setDeleteId)}
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
        title="Supprimer cette édition ?"
        description="Cette édition sera définitivement supprimée."
      />
    </>
  );
}
