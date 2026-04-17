'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  method: string;
  path: string;
  entityType: string;
  entityId: string | null;
  statusCode: number;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  logs: ActivityLogEntry[];
  meta: Meta;
  currentPage: number;
}

const METHOD_STYLES: Record<string, string> = {
  POST:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PUT:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PATCH:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function formatPath(path: string) {
  // Highlight /admin/resource/id
  const parts = path.split('/').filter(Boolean);
  return parts.map((p, i) => (
    <span
      key={i}
      className={i === 0 || i === 1 ? 'text-white/30' : i === 2 ? 'text-white/70' : 'text-white/50 font-mono text-xs'}
    >
      {i > 0 ? '/' : ''}{p}
    </span>
  ));
}

export function ActivityLogTable({ logs, meta, currentPage }: Props) {
  const router = useRouter();

  const goToPage = (p: number) => router.push(`?page=${p}`);

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/30">
              <th className="px-5 py-3 text-left font-medium">Horodatage</th>
              <th className="px-5 py-3 text-left font-medium">Utilisateur</th>
              <th className="px-5 py-3 text-left font-medium">Méthode</th>
              <th className="px-5 py-3 text-left font-medium">Chemin</th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-white/30 text-sm">
                  Aucune activité enregistrée pour l&apos;instant.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                  {/* Timestamp */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <p className="font-mono text-xs text-white/60">
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </p>
                    <p className="font-mono text-xs text-white/30">
                      {new Date(log.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </p>
                  </td>
                  {/* User */}
                  <td className="px-5 py-3 max-w-[180px]">
                    <p className="text-white/80 truncate text-xs">{log.userEmail}</p>
                    <p className="text-white/30 font-mono text-[10px] truncate">{log.userId.slice(0, 8)}…</p>
                  </td>
                  {/* Method */}
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={`font-mono font-bold text-xs ${METHOD_STYLES[log.method] ?? 'bg-white/10 text-white/50 border-white/20'}`}
                    >
                      {log.method}
                    </Badge>
                  </td>
                  {/* Path */}
                  <td className="px-5 py-3 font-mono text-xs text-white/50 max-w-[260px]">
                    <span className="truncate block">{formatPath(log.path)}</span>
                  </td>
                  {/* Entity Type */}
                  <td className="px-5 py-3">
                    <span className="text-xs text-white/50 capitalize">{log.entityType || '—'}</span>
                    {log.entityId && (
                      <p className="text-[10px] font-mono text-white/25 truncate max-w-[80px]">
                        {log.entityId.slice(0, 8)}…
                      </p>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={
                        log.statusCode < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-xs'
                          : log.statusCode < 400
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 font-mono text-xs'
                          : 'bg-red-500/10 text-red-400 border-red-500/20 font-mono text-xs'
                      }
                    >
                      {log.statusCode}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/30">
            Page {meta.page} / {meta.totalPages} · {meta.total} entrées
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="border-white/20 text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= meta.totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="border-white/20 text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
