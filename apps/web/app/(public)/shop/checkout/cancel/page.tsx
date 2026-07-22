import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await searchParams;
  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider mb-4">
          Paiement annulé
        </h1>
        <p className="text-white/50 text-sm mb-10">
          Votre commande {resolvedParams.orderId ? `#${resolvedParams.orderId.split('-')[0]}` : ''} n&apos;a pas été payée. Votre panier a été conservé, vous pouvez réessayer le paiement à tout moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shop/checkout"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Réessayer le paiement
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
