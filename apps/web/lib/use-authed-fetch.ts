'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiUrl } from './api-base';

/**
 * Hook pour les appels API authentifiés côté client.
 *
 * Un 401 ne signifie pas forcément que la session est perdue : l'accessToken
 * porté par la session client a une durée de vie de 15 min et peut être périmé
 * alors que le refresh token reste parfaitement valide. On tente donc d'abord
 * un rafraîchissement (`update()` rejoue le callback `jwt`, qui rafraîchit si
 * nécessaire) et on rejoue la requête une fois. Ce n'est qu'au second 401 que
 * l'on déconnecte — sans quoi l'utilisateur est éjecté toutes les 15 minutes.
 *
 * Usage:
 *   const { authedFetch } = useAuthedFetch();
 *   const data = await authedFetch('/orders/my');
 */
export function useAuthedFetch() {
  const { data: session, update } = useSession();
  const router = useRouter();

  // Dépendre du seul accessToken, et non de l'objet `session` : ce dernier
  // change d'identité à chaque re-render, ce qui relancerait les useEffect
  // construits sur `authedFetch`.
  const accessToken = session?.accessToken;

  const authedFetch = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const call = (token?: string) =>
        fetch(apiUrl(path), {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

      let res = await call(accessToken);
      if (res.status !== 401) return res;

      // Deuxième chance : forcer une rotation puis rejouer une seule fois.
      const refreshed = await update();
      const newToken = refreshed?.accessToken;
      if (newToken && newToken !== accessToken) {
        res = await call(newToken);
        if (res.status !== 401) return res;
      }

      await signOut({ redirect: false });
      router.replace('/login?reason=session_expired');
      throw new Error('Session expirée — veuillez vous reconnecter.');
    },
    [accessToken, update, router]
  );

  return { authedFetch };
}
