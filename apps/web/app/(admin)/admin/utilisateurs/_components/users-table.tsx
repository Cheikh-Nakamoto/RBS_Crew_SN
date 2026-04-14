'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { RoleBadge } from '@/components/admin/role-badge';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deleteUser } from '../actions';
import type { AdminUser, PaginatedMeta, UserRole } from '@/types/admin';

const columns = (onDelete: (id: string) => void): ColumnDef<AdminUser>[] => [
  {
    id: 'name',
    header: 'Utilisateur',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-white">
          {[row.original.firstName, row.original.lastName].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs text-white/40">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Rôle',
    cell: ({ row }) => <RoleBadge role={row.original.role as UserRole} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Inscrit le',
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
        basePath="/admin/utilisateurs"
        onDelete={onDelete}
      />
    ),
    size: 48,
  },
];

interface UsersTableProps {
  data: AdminUser[];
  pagination: PaginatedMeta;
}

export function UsersTable({ data, pagination }: UsersTableProps) {
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
        await deleteUser(deleteId);
        toast.success('Utilisateur supprimé');
        setDeleteId(null);
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <DataTableToolbar searchPlaceholder="Rechercher un utilisateur..." />
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
        title="Supprimer cet utilisateur ?"
        description="L'utilisateur et toutes ses données seront définitivement supprimés."
      />
    </>
  );
}
