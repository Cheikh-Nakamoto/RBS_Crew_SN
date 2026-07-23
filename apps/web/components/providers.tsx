'use client';
import { CartProvider } from '@/lib/cart-store';
import { CartDrawer } from '@/components/cart-drawer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
