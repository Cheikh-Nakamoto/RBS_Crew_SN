'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deleteTag } from '../actions';
import type { AdminTag, PaginatedMeta } from '@/types/admin';

function getColumns(onDelete: (id: string) => void): ColumnDef<AdminTag>[] {
  return [
    { id: 'name', header: 'Nom', cell: ({ row }) => <span className="font-medium text-white">{row.original.translations.find(t => t.locale === 'fr')?.title ?? '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => <DataTableRowActions id={row.original.id} basePath="/admin/tags" onDelete={onDelete} />, size: 48 },
  ];
}

export function TagsTable({ data, pagination }: { data: AdminTag[]; pagination: PaginatedMeta }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const handlePageChange = (page: number) => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page)); router.push(`${pathname}?${p.toString()}`); };
  const confirmDelete = () => { if (!deleteId) return; startDeleting(async () => { try { await deleteTag(deleteId); toast.success('Tag supprimé'); setDeleteId(null); } catch { toast.error('Erreur'); } }); };
  return (<><div className="space-y-4"><DataTableToolbar searchPlaceholder="Rechercher un tag..." /><DataTable columns={getColumns(setDeleteId)} data={data} pagination={pagination} onPageChange={handlePageChange} /></div><DeleteConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} title="Supprimer ce tag ?" /></>);
}
