'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deleteServices } from '../actions';
import type { PaginatedMeta } from '@/types/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getColumns(onDelete: (id: string) => void): ColumnDef<any>[] {
  return [
    { id: 'name', header: 'Titre', cell: ({ row }: { row: { original: { id: string; translations: Array<{ locale: string; title: string }> } } }) => <span className="font-medium text-white">{row.original.translations.find((t: { locale: string }) => t.locale === 'fr')?.title ?? '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }: { row: { original: { id: string } } }) => <DataTableRowActions id={row.original.id} basePath="/admin/services" onDelete={onDelete} />, size: 48 },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ServicesTable({ data, pagination }: { data: any[]; pagination: PaginatedMeta }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const handlePageChange = (page: number) => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page)); router.push(`${pathname}?${p.toString()}`); };
  const confirmDelete = () => { if (!deleteId) return; startDeleting(async () => { try { await deleteServices(deleteId); toast.success('Élément supprimé'); setDeleteId(null); } catch { toast.error('Erreur'); } }); };
  return (<><div className="space-y-4"><DataTableToolbar /><DataTable columns={getColumns(setDeleteId)} data={data} pagination={pagination} onPageChange={handlePageChange} /></div><DeleteConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} /></>);
}
