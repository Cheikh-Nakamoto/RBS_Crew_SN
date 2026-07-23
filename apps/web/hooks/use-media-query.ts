'use client';

import { useSyncExternalStore } from 'react';

/**
 * useMediaQuery — hook SSR-safe pour évaluer une media query.
 *
 * Utilise `useSyncExternalStore` : le snapshot serveur renvoie toujours `false`
 * (rendu desktop-first côté SSR), corrigé au premier rendu client. Chaque
 * appelant qui bifurque son rendu sur cette valeur doit tolérer une correction
 * d'hydration.
 *
 * @example const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const mql = globalThis.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };

  const getSnapshot = () => globalThis.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
