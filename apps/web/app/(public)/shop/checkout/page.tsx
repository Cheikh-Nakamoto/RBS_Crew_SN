'use client';

import { useCart } from '@/lib/cart-store';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { formatXOF } from '@/lib/format';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, AlertTriangle, RefreshCw } from 'lucide-react';
import { CheckoutForm } from './checkout-form';
import { EmailVerificationNotice } from '@/components/email-verification-notice';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { items, removeItem, updateQuantity, total, count } = useCart();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Livraison reportée à une version ultérieure : aucun frais n'est facturé et
  // aucun mode n'est proposé au client. Le module (zones, méthodes, tarifs)
  // reste en place côté API et back-office pour être rebranché plus tard.
  const shippingFee = 0;
  // `null` tant que l'état n'est pas connu : on ne désactive pas le paiement
  // avant d'avoir la réponse, le serveur restant de toute façon l'autorité.
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const isCancelled = searchParams.has('cancelled');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <ShoppingBag className="w-20 h-20 text-white/15 stroke-[1px]" />
        <h1 className="font-display text-3xl text-white uppercase">Panier vide</h1>
        <p className="text-white/40 text-sm">Ajoutez des produits depuis le shop pour continuer.</p>
        <Link
          href="/shop"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Shop
        </Link>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/shop"
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider">
            Checkout
          </h1>
          <span className="text-white/30 text-sm font-semibold">({count} article{count > 1 ? 's' : ''})</span>
        </div>

        {isCancelled && (
          <div className="mb-10 p-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-100">Paiement annulé</p>
              <p className="text-xs text-yellow-200/60 mt-1">
                Votre paiement n&apos;a pas été finalisé. Vous pouvez réessayer.
              </p>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('cancelled');
                router.replace(url.pathname);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-200 text-xs font-semibold transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Votre panier
              </h2>
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 p-4 rounded-xl bg-white/4 border border-white/8">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 font-display text-xs">
                        RBS
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-1">{item.name}</p>
                    <p className="text-xs text-white/40 mt-1">{formatXOF(item.price)} / unité</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white/8 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white/8 text-white/60 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {formatXOF(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-white/25 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {status === 'authenticated' && (
              <div className="mb-6">
                <EmailVerificationNotice onStatusChange={setEmailVerified} />
              </div>
            )}

            <CheckoutForm
              items={items}
              total={total}
              shippingFee={shippingFee}
              sessionExists={status === 'authenticated'}
              emailVerified={emailVerified}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6 p-6 rounded-2xl bg-white/4 border border-white/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                Récapitulatif
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Sous-total ({count} article{count > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-white">{formatXOF(total)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Livraison</span>
                  <span className="font-semibold text-white">
                    {shippingFee > 0 ? formatXOF(shippingFee) : 'Gratuite'}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="font-bold text-white uppercase tracking-wider text-base">Total</span>
                  <span className="font-bold text-white text-xl">{formatXOF(total + shippingFee)}</span>
                </div>
              </div>
              <p className="text-[10px] text-white/20 text-center leading-relaxed mt-6">
                Paiement sécurisé par NabooPay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
