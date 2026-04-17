'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableToolbar } from '@/components/admin/data-table/data-table-toolbar';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { deleteProjets } from '../actions';
import type { PaginatedMeta } from '@/types/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getColumns(onDelete: (id: string) => void): ColumnDef<any>[] {
  return [
    { id: 'name', header: 'Titre', cell: ({ row }: { row: { original: { id: string; translations: Array<{ locale: string; title: string }>; country?: string } } }) => <span className="font-medium text-white">{row.original.translations.find((t: { locale: string }) => t.locale === 'fr')?.title ?? '—'}</span> },
    { id: 'country', header: 'Localisation', cell: ({ row }: { row: { original: { country?: string } } }) => row.original.country ? <span className="flex items-center gap-1.5 text-sm text-white/60"><MapPin className="w-3.5 h-3.5 text-[var(--rbs-red)]" />{row.original.country}</span> : <span className="text-white/20">—</span> },
    { id: 'actions', header: '', cell: ({ row }: { row: { original: { id: string } } }) => <DataTableRowActions id={row.original.id} basePath="/admin/projets" onDelete={onDelete} />, size: 48 },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProjetsTable({ data, pagination }: { data: any[]; pagination: PaginatedMeta }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const handlePageChange = (page: number) => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page)); router.push(`${pathname}?${p.toString()}`); };
  const confirmDelete = () => {
    if (!deleteId) { return; }
    startDeleting(async () => {
      try {
        const result = await deleteProjets(deleteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Élément supprimé');
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    });
  };
  return (<><div className="space-y-4"><DataTableToolbar /><DataTable columns={getColumns(setDeleteId)} data={data} pagination={pagination} onPageChange={handlePageChange} /></div><DeleteConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={confirmDelete} isDeleting={isDeleting} /></>);
}
