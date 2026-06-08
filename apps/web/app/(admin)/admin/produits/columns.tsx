'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import type { AdminProduct } from '@/types/admin';
import { PRODUCT_STATUS_META } from '@/lib/admin/status-maps';

export function getProductColumns(
  onDelete: (id: string) => void
): ColumnDef<AdminProduct>[] {
  return [
    {
      id: 'image',
      header: '',
      cell: ({ row }) => {
        const url = row.original.featuredImageUrl;
        return url ? (
          <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={url} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 text-xs flex-shrink-0">
            ✕
          </div>
        );
      },
      size: 52,
    },
    {
      accessorKey: 'translations',
      header: 'Nom',
      cell: ({ row }) => {
        const fr = row.original.translations.find((t) => t.locale === 'fr');
        return (
          <div>
            <p className="font-medium text-white">{fr?.title ?? '—'}</p>
            {row.original.sku && (
              <p className="text-xs text-white/30 font-mono">{row.original.sku}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: 'Prix',
      cell: ({ row }) => (
        <span className="text-white/80 font-mono text-sm">
          {row.original.price.toLocaleString('fr-SN')} FCFA
        </span>
      ),
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.stock;
        return (
          <Badge
            variant="outline"
            className={
              stock === 0
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : stock < 5
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-white/10 text-white/60 border-white/20'
            }
          >
            {stock}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const meta = PRODUCT_STATUS_META[row.original.status] ?? PRODUCT_STATUS_META.DRAFT;
        return (
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DataTableRowActions
          id={row.original.id}
          basePath="/admin/produits"
          onDelete={onDelete}
        />
      ),
      size: 48,
    },
  ];
}
