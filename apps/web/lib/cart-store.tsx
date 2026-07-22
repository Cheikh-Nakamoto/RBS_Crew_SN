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

// ── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Le panier est stocké exclusivement côté serveur (Redis), aussi bien pour un
 * utilisateur connecté que pour un visiteur — ce dernier étant identifié par le
 * cookie `rbs_gid`. Aucune persistance navigateur : en cas d'erreur réseau on
 * garde un état optimiste en mémoire, qui disparaît au rechargement.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  // La réponse d'un chargement anonyme peut arriver après celle d'un chargement
  // authentifié : seule la réponse du dernier chargement lancé est appliquée.
  const loadSeqRef = useRef(0);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  const applyIfCurrent = useCallback((seq: number, next: CartItem[]) => {
    if (seq === loadSeqRef.current) setItems(next);
  }, []);

  // ── Chargement initial + rechargement au changement d'utilisateur ─────────
  useEffect(() => {
    // On ne bloque pas sur `status === 'loading'` : le panier invité doit
    // s'afficher immédiatement. Quand le token arrive, l'effet se rejoue et le
    // serveur fusionne le panier invité dans celui du compte.
    const currentUserId = accessToken
      ? ((session?.user as { id?: string } | undefined)?.id ?? null)
      : null;
    if (status !== 'loading' && prevUserIdRef.current === currentUserId) return;
    if (status !== 'loading') prevUserIdRef.current = currentUserId;

    const seq = ++loadSeqRef.current;
    fetchCart(accessToken)
      .then((data) => applyIfCurrent(seq, data.items))
      .catch(() => applyIfCurrent(seq, []));
  }, [status, accessToken, session?.user, applyIfCurrent]);

  // ── Opérations panier ────────────────────────────────────────────────────

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;

      // L'API sérialise les montants (`numeric`) en CHAÎNE pour préserver la
      // précision : `price` arrive donc en "15000" malgré le type déclaré.
      // Sans cette conversion, POST /cart/items rejette le corps en 400 —
      // le champ y est attendu en nombre. On normalise ici, unique point
      // d'entrée du panier, plutôt qu'à chaque appelant.
      const normalized: CartItem = {
        ...item,
        price: Number(item.price),
        maxStock: Number(item.maxStock),
        quantity: qty,
      };

      addCartItem(accessToken, normalized)
        .then((data) => setItems(data.items))
        .catch(() => {
          // Mise à jour optimiste locale en cas d'erreur réseau
          setItems((prev) => {
            const idx = prev.findIndex((i) => i.productId === item.productId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                quantity: Math.min(updated[idx].quantity + qty, normalized.maxStock),
              };
              return updated;
            }
            return [...prev, normalized];
          });
        });

      setIsOpen(true);
    },
    [accessToken],
  );

  const removeItem = useCallback(
    (productId: string) => {
      removeCartItem(accessToken, productId)
        .then((data) => setItems(data.items))
        .catch(() => setItems((prev) => prev.filter((i) => i.productId !== productId)));
    },
    [accessToken],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
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
    },
    [accessToken],
  );

  const clearCart = useCallback(() => {
    clearCartApi(accessToken)
      .then(() => setItems([]))
      .catch(() => setItems([]));
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
