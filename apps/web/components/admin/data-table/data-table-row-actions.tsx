'use client';

import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface DataTableRowActionsProps {
  id: string;
  basePath: string;
  onDelete?: (id: string) => void;
  viewable?: boolean;
}

export function DataTableRowActions({ id, basePath, onDelete, viewable = false }: DataTableRowActionsProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 text-white/40 hover:text-white inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 border-white/10 bg-black/90 backdrop-blur-xl text-white"
      >
        {viewable && (
          <DropdownMenuItem
            onClick={() => router.push(`${basePath}/${id}`)}
            className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white"
          >
            <Eye className="h-4 w-4" />
            Voir
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => router.push(`${basePath}/${id}`)}
          className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white"
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </DropdownMenuItem>
        {onDelete && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => onDelete(id)}
              className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
