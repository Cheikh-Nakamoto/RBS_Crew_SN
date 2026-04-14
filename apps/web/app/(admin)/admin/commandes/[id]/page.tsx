import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAdminOrder } from '@/lib/admin/queries';
import { OrderStatusForm } from './_components/order-status-form';
import { OrderDeleteButton } from './_components/order-delete-button';

export const metadata = { title: 'Détail commande' };

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PROCESSING: { label: 'En cours', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  COMPLETED: { label: 'Terminée', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Annulée', className: 'bg-white/10 text-white/40 border-white/20' },
  REFUNDED: { label: 'Remboursée', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  FAILED: { label: 'Échouée', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  UNPAID: { label: 'Non payé', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PAID: { label: 'Payé', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  PARTIALLY_REFUNDED: { label: 'Part. remb.', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  REFUNDED: { label: 'Remboursé', className: 'bg-white/10 text-white/40 border-white/20' },
};

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let order;
  try {
    order = await fetchAdminOrder(id);
  } catch {
    notFound();
  }

  const statusMeta = ORDER_STATUS_META[order.status];
  const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
            <Link href="/admin/commandes"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80">Commandes</p>
            <h1 className="text-2xl font-black text-white">{order.orderNumber}</h1>
          </div>
        </div>
        <OrderDeleteButton orderId={order.id} orderNumber={order.orderNumber} />
      </div>

      {/* Status badges */}
      <div className="flex gap-3">
        <Badge variant="outline" className={statusMeta?.className}>{statusMeta?.label}</Badge>
        <Badge variant="outline" className={paymentMeta?.className}>{paymentMeta?.label}</Badge>
      </div>

      {/* Info client */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Client</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/40 text-xs">Email</p>
            <p className="text-white">{order.customerEmail ?? '—'}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Nom</p>
            <p className="text-white">{order.customerName ?? '—'}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Date</p>
            <p className="text-white">{new Date(order.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Devise</p>
            <p className="text-white">{order.currency}</p>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Articles commandés</p>
        </div>
        {order.items && order.items.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.productName}</p>
                  {item.productName && <p className="text-xs text-white/40">{item.productName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{item.quantity} × {item.unitPrice.toLocaleString('fr-SN')} FCFA</p>
                  <p className="text-xs text-white/40">{item.totalPrice.toLocaleString('fr-SN')} FCFA</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-white/30">Aucun article</p>
        )}
        {/* Totaux */}
        <div className="p-5 border-t border-white/10 space-y-1">
          <div className="flex justify-between text-sm text-white/50">
            <span>Sous-total</span>
            <span>{order.subtotal.toLocaleString('fr-SN')} FCFA</span>
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-white/50">
              <span>Taxes</span>
              <span>{order.taxAmount.toLocaleString('fr-SN')} FCFA</span>
            </div>
          )}
          {order.shippingAmount > 0 && (
            <div className="flex justify-between text-sm text-white/50">
              <span>Livraison</span>
              <span>{order.shippingAmount.toLocaleString('fr-SN')} FCFA</span>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Réduction</span>
              <span>-{order.discountAmount.toLocaleString('fr-SN')} FCFA</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
            <span>Total</span>
            <span>{order.total.toLocaleString('fr-SN')} FCFA</span>
          </div>
        </div>
      </div>

      {/* Changer le statut */}
      <OrderStatusForm orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
