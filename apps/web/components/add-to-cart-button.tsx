'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { ShoppingBag, Check } from 'lucide-react';

interface AddToCartButtonProps {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  maxStock: number;
  disabled?: boolean;
}

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  maxStock,
  disabled = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const inStock = maxStock > 0 && !disabled;

  function handleClick() {
    if (!inStock) return;
    addItem({ productId, slug, name, price, image, maxStock });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button
      onClick={handleClick}
      disabled={!inStock}
      className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
        added
          ? 'bg-green-600 text-white shadow-lg shadow-green-600/25 scale-[1.01]'
          : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 hover:scale-[1.01]'
      }`}
    >
      {!inStock ? (
        'Produit indisponible'
      ) : added ? (
        <>
          <Check className="w-5 h-5" />
          Ajouté au panier !
        </>
      ) : (
        <>
          <ShoppingBag className="w-5 h-5" />
          Ajouter au panier
        </>
      )}
    </button>
  );
}
