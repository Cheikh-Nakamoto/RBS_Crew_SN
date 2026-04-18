import type { CartItem } from './cart-store';

const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

async function fetchWithLog(url: string, init?: RequestInit) {
  const method = init?.method || 'GET';
  console.log(`[API REQUEST] ${method} ${url}`);
  const res = await fetch(url, init);
  console.log(`[API RESPONSE] ${method} ${url} - Status: ${res.status}`);
  return res;
}
export interface CartResponse {
  items: CartItem[];
  total: number;
  count: number;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchCart(accessToken: string): Promise<CartResponse> {
  const res = await fetchWithLog(`${API_URL}/cart`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error('Impossible de charger le panier');
  return res.json() as Promise<CartResponse>;
}

export async function addCartItem(
  accessToken: string,
  item: CartItem,
): Promise<CartResponse> {
  const res = await fetchWithLog(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Impossible d'ajouter l'article");
  return res.json() as Promise<CartResponse>;
}

export async function updateCartItem(
  accessToken: string,
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const res = await fetchWithLog(`${API_URL}/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Impossible de modifier la quantité');
  return res.json() as Promise<CartResponse>;
}

export async function removeCartItem(
  accessToken: string,
  productId: string,
): Promise<CartResponse> {
  const res = await fetchWithLog(`${API_URL}/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error("Impossible de supprimer l'article");
  return res.json() as Promise<CartResponse>;
}

export async function clearCartApi(accessToken: string): Promise<void> {
  const res = await fetchWithLog(`${API_URL}/cart`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error('Impossible de vider le panier');
}

export async function syncCart(
  accessToken: string,
  guestItems: CartItem[],
): Promise<CartResponse> {
  const res = await fetchWithLog(`${API_URL}/cart/sync`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ items: guestItems }),
  });
  if (!res.ok) throw new Error('Impossible de synchroniser le panier');
  return res.json() as Promise<CartResponse>;
}
