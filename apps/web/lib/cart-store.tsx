'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCartApi,
  syncCart,
} from './cart-api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'rbs-cart';

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — silently fail
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  // ── Load/sync cart when auth state changes ───────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;

    if (accessToken) {
      const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? null;

      // Only reload when the user actually changes (avoid infinite loops)
      if (prevUserIdRef.current === currentUserId) return;
      prevUserIdRef.current = currentUserId;

      const guestItems = loadCart();

      if (guestItems.length > 0) {
        // Merge guest cart into server cart then clear localStorage
        syncCart(accessToken, guestItems)
          .then((data) => {
            setItems(data.items);
            localStorage.removeItem(STORAGE_KEY);
          })
          .catch(() => {
            // Fallback: keep guest items in memory
            setItems(guestItems);
          });
      } else {
        fetchCart(accessToken)
          .then((data) => setItems(data.items))
          .catch(() => setItems([]));
      }
    } else {
      // Unauthenticated: reset tracking ref and load from localStorage
      if (prevUserIdRef.current !== null) {
        prevUserIdRef.current = null;
      }
      setItems(loadCart());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, accessToken]);

  // ── Persist to localStorage for guest users ──────────────────────────────
  useEffect(() => {
    if (!accessToken && status !== 'loading') {
      saveCart(items);
    }
  }, [items, accessToken, status]);

  // ── Cart operations ──────────────────────────────────────────────────────

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;

      if (accessToken) {
        addCartItem(accessToken, { ...item, quantity: qty })
          .then((data) => setItems(data.items))
          .catch(() => {
            // Optimistic local update on network error
            setItems((prev) => {
              const idx = prev.findIndex((i) => i.productId === item.productId);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = {
                  ...updated[idx],
                  quantity: Math.min(updated[idx].quantity + qty, item.maxStock),
                };
                return updated;
              }
              return [...prev, { ...item, quantity: qty }];
            });
          });
      } else {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.productId === item.productId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              quantity: Math.min(updated[idx].quantity + qty, item.maxStock),
            };
            return updated;
          }
          return [...prev, { ...item, quantity: qty }];
        });
      }

      setIsOpen(true);
    },
    [accessToken],
  );

  const removeItem = useCallback(
    (productId: string) => {
      if (accessToken) {
        removeCartItem(accessToken, productId)
          .then((data) => setItems(data.items))
          .catch(() => setItems((prev) => prev.filter((i) => i.productId !== productId)));
      } else {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
      }
    },
    [accessToken],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (accessToken) {
        updateCartItem(accessToken, productId, quantity)
          .then((data) => setItems(data.items))
          .catch(() => {
            setItems((prev) =>
              quantity <= 0
                ? prev.filter((i) => i.productId !== productId)
                : prev.map((i) =>
                    i.productId === productId
                      ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                      : i,
                  ),
            );
          });
      } else {
        if (quantity <= 0) {
          setItems((prev) => prev.filter((i) => i.productId !== productId));
          return;
        }
        setItems((prev) =>
          prev.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i,
          ),
        );
      }
    },
    [accessToken],
  );

  const clearCart = useCallback(() => {
    if (accessToken) {
      clearCartApi(accessToken)
        .then(() => setItems([]))
        .catch(() => setItems([]));
    } else {
      setItems([]);
    }
  }, [accessToken]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
