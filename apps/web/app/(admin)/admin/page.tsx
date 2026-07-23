import { Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardChart } from '@/components/admin/dashboard-chart';
import { DashboardStats } from '@/components/admin/dashboard-stats';
import {
  fetchAdminOrders,
  fetchAdminUsers,
  fetchAdminProducts,
  fetchAdminQuotes,
} from '@/lib/admin/queries';

export const metadata = { title: 'Tableau de bord' };

export default async function AdminDashboardPage() {
  const [ordersData, usersData, productsData, quotesData] = await Promise.all([
    fetchAdminOrders({ page: 1, limit: 5, status: 'PENDING' }).catch(() => ({
      data: [],
      meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
    })),
    fetchAdminUsers({ page: 1, limit: 1 }).catch(() => ({
      data: [],
      meta: { total: 0, page: 1, limit: 1, totalPages: 0 },
    })),
    fetchAdminProducts({ page: 1, limit: 1, status: 'PUBLISHED' }).catch(() => ({
      data: [],
      meta: { total: 0, page: 1, limit: 1, totalPages: 0 },
    })),
    fetchAdminQuotes({ page: 1, limit: 5 }).catch(() => ({
      data: [],
      meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
    })),
  ]);

  // Build status breakdown for orders chart
  const orderStatusChart = [
    { label: 'En attente', value: ordersData.meta.total },
    { label: 'Produits', value: productsData.meta.total },
    { label: 'Utilisateurs', value: usersData.meta.total },
    { label: 'Devis', value: quotesData.meta.total },
  ];

  return (
    <div className="space-y-8">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80 mb-1">
          Back-office
        </p>
        <h1 className="text-3xl font-black text-white tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-white/40">
          Bienvenue sur le panneau d&apos;administration RBS Crew SN.
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <DashboardStats
        ordersTotal={ordersData.meta.total}
        usersTotal={usersData.meta.total}
        productsTotal={productsData.meta.total}
        quotesTotal={quotesData.meta.total}
      />

      {/* ── Chart + Recent ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="min-w-0 xl:col-span-1 rounded-xl border border-white/10 bg-white/3 p-5">
          <DashboardChart
            data={orderStatusChart}
            title="Vue d'ensemble"
            color="oklch(0.52 0.20 18)"
          />
        </div>

        {/* Recent orders */}
        <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Commandes en attente</p>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/40 hover:text-white text-xs gap-1"
            >
              <Link href="/admin/commandes">
                Voir tout <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {ordersData.data.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-white/30">Aucune commande en attente</p>
              <p className="text-xs text-white/20 mt-1">Tout est traité ✓</p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-white/5">
              {ordersData.data.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group focus-visible:outline-none focus-visible:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono text-white/80 group-hover:text-white transition-colors truncate">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-white/30 truncate">
                        {order.customerEmail ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-sm font-mono text-white">
                        {order.total?.toLocaleString('fr-SN')} FCFA
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs"
                      >
                        En attente
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Recent Quotes ──────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Devis récents</p>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white/40 hover:text-white text-xs gap-1"
          >
            <Link href="/admin/devis">
              Voir tout <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {quotesData.data.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-white/30">Aucun devis reçu</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-white/5">
            {quotesData.data.slice(0, 5).map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/admin/devis/${quote.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">
                      {quote.name}
                    </p>
                    <p className="text-xs text-white/30 truncate">{quote.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs ml-3 flex-shrink-0"
                  >
                    Nouveau
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
          Actions rapides
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="gradient" asChild>
            <Link href="/admin/produits/nouveau">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouveau produit
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Link href="/admin/artistes/nouveau">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouvel artiste
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <Link href="/admin/commandes">Voir les commandes</Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <Link href="/admin/devis">Voir les devis</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
