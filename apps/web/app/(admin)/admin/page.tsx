import { ShoppingCart, Users, Package, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminStatsCard } from '@/components/admin/admin-stats-card';
import {
  fetchAdminOrders,
  fetchAdminUsers,
  fetchAdminProducts,
  fetchAdminQuotes,
} from '@/lib/admin/queries';

export const metadata = { title: 'Tableau de bord' };

export default async function AdminDashboardPage() {
  const [ordersData, usersData, productsData, quotesData] = await Promise.all([
    fetchAdminOrders({ page: 1, limit: 5, status: 'PENDING' }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } })),
    fetchAdminUsers({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } })),
    fetchAdminProducts({ page: 1, limit: 1, status: 'PUBLISHED' }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } })),
    fetchAdminQuotes({ page: 1, limit: 5 }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } })),
  ]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80 mb-1">
          Back-office
        </p>
        <h1 className="text-3xl font-black text-white tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-white/40">Bienvenue sur le panneau d&apos;administration RBS Crew SN.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminStatsCard
          label="Commandes en attente"
          value={ordersData.meta.total}
          icon={ShoppingCart}
          description="Nécessitent une action"
        />
        <AdminStatsCard
          label="Utilisateurs"
          value={usersData.meta.total}
          icon={Users}
          description="Total inscrits"
        />
        <AdminStatsCard
          label="Produits publiés"
          value={productsData.meta.total}
          icon={Package}
          description="En ligne actuellement"
        />
        <AdminStatsCard
          label="Devis reçus"
          value={quotesData.meta.total}
          icon={FileText}
          description="Total des demandes"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Dernières commandes en attente</p>
            <Button variant="ghost" size="sm" asChild className="text-white/40 hover:text-white text-xs">
              <Link href="/admin/commandes">Voir tout →</Link>
            </Button>
          </div>
          {ordersData.data.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/30">Aucune commande en attente</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {ordersData.data.slice(0, 5).map((order) => (
                <li key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-mono text-white/80">{order.orderNumber}</p>
                    <p className="text-xs text-white/30">{order.customerEmail ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-white">{order.total?.toLocaleString('fr-SN')} FCFA</span>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      En attente
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent quotes */}
        <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Devis récents</p>
            <Button variant="ghost" size="sm" asChild className="text-white/40 hover:text-white text-xs">
              <Link href="/admin/devis">Voir tout →</Link>
            </Button>
          </div>
          {quotesData.data.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/30">Aucun devis reçu</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {quotesData.data.slice(0, 5).map((quote) => (
                <li key={quote.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{quote.name}</p>
                    <p className="text-xs text-white/30 truncate">{quote.email}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs ml-3 flex-shrink-0">
                    Nouveau
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white">
          <Link href="/admin/produits/nouveau">+ Nouveau produit</Link>
        </Button>
        <Button asChild variant="outline" className="border-white/20 text-white/70 hover:bg-white/5 hover:text-white">
          <Link href="/admin/commandes">Voir les commandes</Link>
        </Button>
        <Button asChild variant="outline" className="border-white/20 text-white/70 hover:bg-white/5 hover:text-white">
          <Link href="/admin/artistes/nouveau">+ Nouvel artiste</Link>
        </Button>
      </div>
    </div>
  );
}
