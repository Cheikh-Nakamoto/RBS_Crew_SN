'use client';

import { useEffect, useRef, useState } from 'react';
import { SuccessContent } from './success-content';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'UNPAID';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export function OrderStatusPoller({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStatus(data.status);
          if (data.status === 'PAID' || data.status === 'FAILED' || data.status === 'REFUNDED') {
            return; // Terminal state
          }
        }
      } catch {
        // Network error, retry
      }
      
      if (cancelled) return;
      
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId]);

  if (status === 'PAID') return <SuccessContent orderId={orderId} />;
  
  if (status === 'FAILED') {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-4">
            Paiement échoué
          </h1>
          <p className="text-white/50 text-sm mb-10">
            Malheureusement, votre paiement n'a pas pu être traité. Veuillez réessayer.
          </p>
          <Link
            href={`/shop/checkout?cancelled=1`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Réessayer le paiement
          </Link>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-4">
            En attente de confirmation
          </h1>
          <p className="text-white/50 text-sm mb-10">
            Votre paiement est toujours en cours de traitement. Vous recevrez un email dès qu'il sera confirmé.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Voir mes commandes
          </Link>
        </div>
      </div>
    );
  }

  // Processing View
  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center justify-center h-[50vh]">
        <div className="w-12 h-12 border-4 border-white/10 border-t-red-600 rounded-full animate-spin mb-6" />
        <h1 className="font-display text-2xl text-white uppercase tracking-wider mb-2">
          Confirmation en cours...
        </h1>
        <p className="text-white/40 text-sm">
          Veuillez ne pas fermer cette page. Nous vérifions le statut de votre paiement avec NabooPay.
        </p>
      </div>
    </div>
  );
}
