import type { CartItem } from './cart-store';
import { apiUrl } from './api-base';

export interface CartResponse {
  items: CartItem[];
  total: number;
  count: number;
}

/**
 * Le panier vit entièrement côté serveur. Un visiteur non connecté est identifié
 * par le cookie signé `rbs_gid` posé par l'API — d'où `credentials: 'include'`
 * sur chaque appel. Le token n'est présent que pour un utilisateur connecté ;
 * c'est ce qui déclenche côté serveur la fusion du panier invité vers le compte.
 */
function headers(accessToken?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function fetchCart(accessToken?: string | null): Promise<CartResponse> {
  const res = await fetch(apiUrl('/cart'), {
    headers: headers(accessToken),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Impossible de charger le panier');
  return res.json() as Promise<CartResponse>;
}

export async function addCartItem(
  accessToken: string | null | undefined,
  item: CartItem,
): Promise<CartResponse> {
  const res = await fetch(apiUrl('/cart/items'), {
    method: 'POST',
    headers: headers(accessToken),
    credentials: 'include',
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Impossible d'ajouter l'article");
  return res.json() as Promise<CartResponse>;
}

export async function updateCartItem(
  accessToken: string | null | undefined,
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const res = await fetch(apiUrl(`/cart/items/${encodeURIComponent(productId)}`), {
    method: 'PATCH',
    headers: headers(accessToken),
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Impossible de modifier la quantité');
  return res.json() as Promise<CartResponse>;
}

export async function removeCartItem(
  accessToken: string | null | undefined,
  productId: string,
): Promise<CartResponse> {
  const res = await fetch(apiUrl(`/cart/items/${encodeURIComponent(productId)}`), {
    method: 'DELETE',
    headers: headers(accessToken),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Impossible de supprimer l'article");
  return res.json() as Promise<CartResponse>;
}

export async function clearCartApi(accessToken?: string | null): Promise<void> {
  const res = await fetch(apiUrl('/cart'), {
    method: 'DELETE',
    headers: headers(accessToken),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Impossible de vider le panier');
}
