'use client';

import { ShoppingCart, Users, Package, FileText } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

interface DashboardStatsProps {
  ordersTotal: number;
  usersTotal: number;
  productsTotal: number;
  quotesTotal: number;
}

export function DashboardStats({
  ordersTotal,
  usersTotal,
  productsTotal,
  quotesTotal,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Commandes en attente"
        value={ordersTotal}
        icon={<ShoppingCart className="w-4 h-4" aria-hidden="true" />}
        description="Nécessitent une action"
        variant={ordersTotal > 0 ? 'warning' : 'default'}
        animated
      />
      <StatCard
        label="Utilisateurs"
        value={usersTotal}
        icon={<Users className="w-4 h-4" aria-hidden="true" />}
        description="Total inscrits"
        variant="success"
        animated
      />
      <StatCard
        label="Produits publiés"
        value={productsTotal}
        icon={<Package className="w-4 h-4" aria-hidden="true" />}
        description="En ligne actuellement"
        animated
      />
      <StatCard
        label="Devis reçus"
        value={quotesTotal}
        icon={<FileText className="w-4 h-4" aria-hidden="true" />}
        description="Total des demandes"
        variant="default"
        animated
      />
    </div>
  );
}
