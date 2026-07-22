'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteServices } from '../actions';
import { getServiceColumns } from '../columns';
import type { PaginatedMeta, AdminService } from '@/types/admin';

interface ServicesTableProps {
  data: AdminService[];
  pagination: PaginatedMeta;
}

export function ServicesTable({ data, pagination }: ServicesTableProps) {
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
        const result = await deleteServices(deleteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Service supprimé');
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher un service..." />
        <DataTable
          columns={getServiceColumns(setDeleteId)}
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
        title="Supprimer ce service ?"
        description="Ce service sera définitivement supprimé."
      />
    </>
  );
}
