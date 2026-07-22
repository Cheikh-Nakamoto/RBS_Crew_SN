'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiUrl } from './api-base';

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
      const token = (session as (typeof session & { accessToken?: string }) | null)?.accessToken;

      const res = await fetch(apiUrl(path), {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

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
