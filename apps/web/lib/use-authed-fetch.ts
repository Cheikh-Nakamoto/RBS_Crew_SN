'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Hook pour les appels API authentifiés côté client.
 * Détecte automatiquement les 401 (token expiré) et redirige vers /login.
 *
 * Usage:
 *   const { authedFetch } = useAuthedFetch();
 *   const data = await authedFetch('/orders/my');
 */
export function useAuthedFetch() {
  const { data: session } = useSession();
  const router = useRouter();

  const authedFetch = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const token = (session as (typeof session & { accessToken?: string }) | null)?.accessToken;

      const method = options.method || 'GET';
      const url = `${API_URL}${path}`;
      console.log(`[API REQUEST] ${method} ${url}`);

      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log(`[API RESPONSE] ${method} ${url} - Status: ${res.status}`);

      // Token expiré ou invalide → déconnexion + redirect /login
      if (res.status === 401) {
        await signOut({ redirect: false });
        router.replace('/login?reason=session_expired');
        throw new Error('Session expirée — veuillez vous reconnecter.');
      }

      return res;
    },
    [session, router]
  );

  return { authedFetch };
}
