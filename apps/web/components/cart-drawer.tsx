'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { formatXOF } from '@/lib/format';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, X } from 'lucide-react';

export function CartDrawer() {
  const { items, removeItem, updateQuantity, total, count, isOpen, setIsOpen } = useCart();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[61] h-full w-full max-w-md bg-[#111111] border-l border-white/10 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-white/60" />
            <h2 className="font-display text-lg uppercase tracking-wider text-white">
              Panier
            </h2>
            {count > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer le panier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30">
              <ShoppingBag className="w-16 h-16 stroke-[1px]" />
              <p className="text-sm font-medium">Votre panier est vide</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-red-500 hover:text-white transition-colors uppercase tracking-wider font-semibold"
              >
                Continuer vos achats
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-4 p-3 rounded-xl bg-white/4 border border-white/8 group hover:border-white/15 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 font-display text-xs">
                        RBS
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/shop/${item.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="text-sm font-semibold text-white hover:text-red-400 transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-white/40 mt-0.5">{formatXOF(item.price)}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white/8 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white/8 text-white/60 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal + remove */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {formatXOF(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-white/25 hover:text-red-500 transition-colors"
                          aria-label="Retirer du panier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50 uppercase tracking-wider font-semibold">
                Sous-total
              </span>
              <span className="text-xl font-bold text-white">{formatXOF(total)}</span>
            </div>
            <p className="text-[10px] text-white/30">
              Frais de livraison calculés à l&apos;étape suivante.
            </p>
            <Link
              href="/shop/checkout"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-all duration-200 hover:scale-[1.01] shadow-lg shadow-red-600/25"
            >
              Commander
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
