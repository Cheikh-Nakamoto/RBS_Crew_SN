'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { RoleBadge } from '@/components/admin/role-badge';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import type { AdminUser, UserRole } from '@/types/admin';

export function getUserColumns(onDelete: (id: string) => void): ColumnDef<AdminUser>[] {
  return [
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
        <DataTableRowActions id={row.original.id} basePath="/admin/utilisateurs" onDelete={onDelete} />
      ),
      size: 48,
    },
  ];
}
