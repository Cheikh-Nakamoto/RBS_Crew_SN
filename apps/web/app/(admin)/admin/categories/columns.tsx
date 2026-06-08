'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import type { AdminCategory } from '@/types/admin';

function getCategoryName(entity: AdminCategory): string {
  return entity.translations.find((t) => t.locale === 'fr')?.title ?? entity.translations[0]?.title ?? '—';
}

export function getCategoryColumns(onDelete: (id: string) => void): ColumnDef<AdminCategory>[] {
  return [
    {
      id: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <span className="font-medium text-white">{getCategoryName(row.original)}</span>
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
