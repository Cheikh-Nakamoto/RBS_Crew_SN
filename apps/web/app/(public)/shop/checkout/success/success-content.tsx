'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatXOF } from '@/lib/format';
import { authedApi } from '@/lib/api';
import { useCart } from '@/lib/cart-store';
import {
  CheckCircle2,
  ShoppingBag,
  Package,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { Order } from '@rbs/types';
import { ErrorState } from '@/components/ui/error-state';

export function SuccessContent({ orderId }: { orderId?: string | null }) {
  const { data: session, status, update } = useSession();
  const { clearCart } = useCart();

  // Dépendre du seul token, et non de l'objet session : ce dernier change
  // d'identité à chaque re-render, ce qui rechargerait la commande en boucle.
  const accessToken = session?.accessToken;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Paiement abouti mais session perdue : cas distinct d'une erreur, il ne doit
  // surtout pas s'afficher comme un échec de commande.
  const [sessionLost, setSessionLost] = useState(false);

  // Chargement de la commande depuis l'API : les setState d'erreur immédiats
  // sont des cas de sortie, pas une synchronisation d'état dérivée.
  //
  // Le paiement passe par une redirection externe qui peut durer plusieurs
  // minutes (saisie du code, confirmation opérateur) : l'access token a de
  // bonnes chances d'avoir expiré au retour. On tente donc un rafraîchissement
  // avant de conclure — et si l'on échoue, le message doit d'abord CONFIRMER le
  // paiement. Personne ne doit croire que sa commande a échoué alors qu'elle est
  // enregistrée.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (status === 'loading') return;

    if (!orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Aucune commande trouvée.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      let token = accessToken;
      if (!token) {
        token = (await update())?.accessToken;
      }
      if (!token) {
        if (!cancelled) {
          setError(null);
          setSessionLost(true);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await authedApi(token).get(`orders/${orderId}`).json<Order>();
        if (cancelled) return;
        setOrder(data);
        // Le panier serveur est vidé par le webhook de paiement ; cet appel
        // rafraîchit l'affichage sans attendre la prochaine navigation.
        clearCart();
      } catch {
        if (!cancelled) setError('Impossible de charger les détails de la commande.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, accessToken, status, update, clearCart]);

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Paiement enregistré, mais la session a expiré pendant la redirection vers
  // le prestataire. On confirme d'abord le paiement — l'utilisateur vient de
  // payer, lui montrer un écran d'erreur serait alarmant et faux.
  if (sessionLost) {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-4">
            Paiement enregistré
          </h1>
          <p className="text-white/50 text-sm mb-2">
            Votre commande est bien prise en compte et vous recevrez un e-mail de
            confirmation sous peu.
          </p>
          <p className="text-white/40 text-sm mb-10">
            Votre session a expiré pendant le paiement : reconnectez-vous pour consulter
            le détail de la commande.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent('/profile')}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Se reconnecter
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <ErrorState />
          <p className="text-white/40 text-sm mt-6">{error}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Retour au Shop
          </Link>
        </div>
      </div>
    );
  }

  // Generic success without order details (redirected without orderId but payment succeeded)
  if (!order) {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-4">
            Commande confirmée !
          </h1>
          <p className="text-white/50 text-sm mb-10">
            Merci pour votre achat. Vous recevrez un email de confirmation sous peu.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Continuer vos achats
          </Link>
        </div>
      </div>
    );
  }

  // Full success with order details
  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Success icon */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-3">
            Merci !
          </h1>
          <p className="text-white/50 text-sm">
            Votre commande a été confirmée et sera traitée rapidement.
          </p>
        </div>

        {/* Order card */}
        <div className="rounded-2xl bg-white/4 border border-white/10 overflow-hidden mb-8">
          {/* Order header */}
          <div className="px-6 py-5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">
                Commande
              </p>
              <p className="text-lg font-bold text-white font-mono tracking-wider">
                #{order.orderNumber}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Clock className="w-3.5 h-3.5" />
                {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : order.paymentStatus === 'UNPAID'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                {order.paymentStatus === 'PAID'
                  ? 'Payé'
                  : order.paymentStatus === 'UNPAID'
                    ? 'En attente'
                    : order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Order items */}
          <div className="px-6 py-4 space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/6"
              >
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white/15" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white line-clamp-1">
                    {item.productName}
                  </p>
                  {item.productSku && (
                    <p className="text-[10px] text-white/25 font-mono mt-0.5">
                      SKU: {item.productSku}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">
                    {formatXOF(item.totalPrice)}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    Qté: {item.quantity} × {formatXOF(item.unitPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order totals */}
          <div className="px-6 py-4 border-t border-white/8 space-y-2">
            <div className="flex justify-between text-sm text-white/50">
              <span>Sous-total</span>
              <span className="font-semibold text-white/70">{formatXOF(order.subtotal)}</span>
            </div>
            {order.shippingAmount > 0 && (
              <div className="flex justify-between text-sm text-white/50">
                <span>Livraison</span>
                <span className="font-semibold text-white/70">{formatXOF(order.shippingAmount)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-white/50">
                <span>Taxes</span>
                <span className="font-semibold text-white/70">{formatXOF(order.taxAmount)}</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-400/70">
                <span>Réduction</span>
                <span className="font-semibold">-{formatXOF(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-white/8">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-white">{formatXOF(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/shop"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Continuer vos achats
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}
