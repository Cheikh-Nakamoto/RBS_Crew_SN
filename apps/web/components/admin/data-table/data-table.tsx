'use client';

import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DataTablePagination } from './data-table-pagination';
import type { PaginatedMeta } from '@/types/admin';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Priorité d'affichage responsive :
     * 1 (ou absent) = toujours visible, 2 = masquée sous `md`, 3 = masquée sous `lg`.
     */
    priority?: 1 | 2 | 3;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: PaginatedMeta;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

/** Identifiant TanStack d'une colonne (explicite ou dérivé de l'accessorKey). */
function columnId<TData, TValue>(col: ColumnDef<TData, TValue>): string | undefined {
  if (col.id) return col.id;
  if ('accessorKey' in col && col.accessorKey != null) return String(col.accessorKey);
  return undefined;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPageChange,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const isBelowMd = useMediaQuery('(max-width: 767px)');
  const isBelowLg = useMediaQuery('(max-width: 1023px)');

  // Masque les colonnes secondaires selon leur priorité : sur mobile la table
  // reste lisible, le reste passe par le scroll horizontal de `ui/table`.
  const columnVisibility = useMemo<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    for (const col of columns) {
      const id = columnId(col);
      if (!id) continue;
      const priority = col.meta?.priority;
      if (priority === 3 && isBelowLg) visibility[id] = false;
      else if (priority === 2 && isBelowMd) visibility[id] = false;
    }
    return visibility;
  }, [columns, isBelowMd, isBelowLg]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
    state: { columnVisibility },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/10 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-white/50 text-xs uppercase tracking-wider bg-white/3 font-semibold h-11"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-white/10 hover:bg-white/5 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-white/80 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-24 text-center text-white/40"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && onPageChange && (
        <DataTablePagination pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}
