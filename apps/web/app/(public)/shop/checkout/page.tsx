'use client';

import { useCart } from '@/lib/cart-store';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatXOF } from '@/lib/format';
import { useAuthedFetch } from '@/lib/use-authed-fetch';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Lock, ArrowRight, CreditCard, Smartphone } from 'lucide-react';

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, total, count, clearCart } = useCart();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { authedFetch } = useAuthedFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'PAYPAL'>('WAVE');

  // Shipping info form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'SN',
  });

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Redirect to login if not authenticated
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

  const handleCheckout = async () => {
    if (!session) {
      router.push('/login?callbackUrl=/shop/checkout');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create order
      const orderRes = await authedFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          shippingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => null);
        throw new Error(errData?.message || 'Erreur lors de la création de la commande');
      }

      const order = await orderRes.json();

      // 2. Create checkout with selected payment method
      const checkoutRes = await authedFetch('/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod,
          successUrl: `${window.location.origin}/shop/checkout?success=1`,
          cancelUrl: `${window.location.origin}/shop/checkout?cancelled=1`,
        }),
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json().catch(() => null);
        throw new Error(errData?.message || 'Erreur lors de la création du paiement');
      }

      const checkout = await checkoutRes.json();

      // 3. Clear cart and redirect to provider
      clearCart();
      if (checkout.url) {
        window.location.href = checkout.url;
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const SHIPPING_FEE = 0; // Free for now, backend calculates

  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
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

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left column — Cart items + form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Cart items */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Votre panier
              </h2>
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 p-4 rounded-xl bg-white/4 border border-white/8"
                >
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

            {/* Shipping Info Form */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Adresse de livraison
              </h2>

              {!session && (
                <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                  <p className="text-sm text-yellow-200/80">
                    Vous devez être{' '}
                    <Link href="/login?callbackUrl=/shop/checkout" className="underline font-semibold text-yellow-200">
                      connecté
                    </Link>{' '}
                    pour finaliser votre commande.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Prénom *"
                  value={form.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  className="col-span-1 px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  value={form.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  className="col-span-1 px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Adresse ligne 1 *"
                value={form.line1}
                onChange={(e) => updateForm('line1', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
                required
              />
              <input
                type="text"
                placeholder="Adresse ligne 2 (optionnel)"
                value={form.line2}
                onChange={(e) => updateForm('line2', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ville *"
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
                  required
                />
                <input
                  type="text"
                  placeholder="Code postal"
                  value={form.postalCode}
                  onChange={(e) => updateForm('postalCode', e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
                />
              </div>
              <select
                value={form.country}
                onChange={(e) => updateForm('country', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all appearance-none"
              >
                <option value="SN" className="bg-[#111]">Sénégal</option>
                <option value="FR" className="bg-[#111]">France</option>
                <option value="CI" className="bg-[#111]">Côte d&apos;Ivoire</option>
                <option value="ML" className="bg-[#111]">Mali</option>
                <option value="GM" className="bg-[#111]">Gambie</option>
                <option value="MR" className="bg-[#111]">Mauritanie</option>
                <option value="MA" className="bg-[#111]">Maroc</option>
                <option value="BE" className="bg-[#111]">Belgique</option>
                <option value="CH" className="bg-[#111]">Suisse</option>
                <option value="US" className="bg-[#111]">États-Unis</option>
              </select>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Moyen de paiement
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'WAVE' as const, label: 'Wave', color: 'bg-[#1DC3F7]', icon: <Smartphone className="w-5 h-5" />, desc: 'Paiement mobile' },
                  { id: 'ORANGE_MONEY' as const, label: 'Orange Money', color: 'bg-[#FF6600]', icon: <Smartphone className="w-5 h-5" />, desc: 'Paiement mobile' },
                  { id: 'STRIPE' as const, label: 'Carte bancaire', color: 'bg-[#635BFF]', icon: <CreditCard className="w-5 h-5" />, desc: 'Visa / Mastercard' },
                  { id: 'PAYPAL' as const, label: 'PayPal', color: 'bg-[#003087]', icon: (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
                    </svg>
                  ), desc: 'Compte PayPal' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      paymentMethod === method.id
                        ? 'border-white/40 bg-white/8'
                        : 'border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${method.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${paymentMethod === method.id ? 'text-white' : 'text-white/70'}`}>
                        {method.label}
                      </p>
                      <p className="text-[10px] text-white/30">{method.desc}</p>
                    </div>
                    {paymentMethod === method.id && (
                      <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Order summary */}
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
                    {SHIPPING_FEE > 0 ? formatXOF(SHIPPING_FEE) : 'Gratuite'}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="font-bold text-white uppercase tracking-wider text-base">Total</span>
                  <span className="font-bold text-white text-xl">{formatXOF(total + SHIPPING_FEE)}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading || !form.firstName || !form.lastName || !form.line1 || !form.city}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-600/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : !session ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Se connecter pour payer
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Payer {formatXOF(total + SHIPPING_FEE)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-white/20 text-center leading-relaxed">
                Paiement sécurisé. Vos informations sont protégées.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
