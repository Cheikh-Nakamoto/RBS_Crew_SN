import { authedApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActivityLogTable } from '@/components/admin/activity-log-table';
import { Activity } from 'lucide-react';

export const metadata = { title: "Journal d'activité — Admin" };

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

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function fetchActivityLogs(token: string, page = 1, limit = 50) {
  try {
    return await authedApi(token)
      .get('admin/activity-logs', { searchParams: { page, limit } })
      .json<PaginatedResponse<ActivityLogEntry>>();
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect('/login');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const result = await fetchActivityLogs(session.accessToken as string, page, 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80 mb-1">
            Audit
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="w-7 h-7 text-[var(--rbs-red)]" />
            Journal d&apos;activité
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Toutes les actions d&apos;écriture effectuées par les administrateurs.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-white">{result.meta.total}</p>
          <p className="text-xs text-white/40 mt-0.5">entrées au total</p>
        </div>
      </div>

      {/* Table */}
      <ActivityLogTable
        logs={result.data}
        meta={result.meta}
        currentPage={page}
      />
    </div>
  );
}
