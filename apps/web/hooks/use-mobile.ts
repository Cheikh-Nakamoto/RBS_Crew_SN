'use client';

import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * Point de rupture mobile — aligné sur `md` de Tailwind (768px) et sur les
 * règles perf `@media (max-width: 767px)` de `globals.css`.
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * useIsMobile — `true` en dessous de {@link MOBILE_BREAKPOINT} (< 768px).
 * SSR-safe : renvoie `false` au rendu serveur, corrigé côté client.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
