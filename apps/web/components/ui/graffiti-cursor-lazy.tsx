'use client';

import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * GraffitiCursorLazy — enveloppe client qui code-splitte le curseur graffiti
 * (framer-motion + WebGL, ~620 lignes) et ne le charge que là où il sert.
 *
 * - `ssr: false` interdit dans un Server Component → ce wrapper client est
 *   obligatoire (le layout public est un RSC).
 * - Les media queries `useMediaQuery` sont SSR-safe (snapshot serveur = `false`) :
 *   sur mobile (pointer coarse) ou en `prefers-reduced-motion`, on retourne
 *   `null` avant le `dynamic()`, donc le chunk n'est jamais téléchargé.
 */
const GraffitiCursor = dynamic(
  () => import('./graffiti-cursor').then((m) => m.GraffitiCursor),
  { ssr: false },
);

export function GraffitiCursorLazy() {
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (isCoarse || reduced) return null;
  return <GraffitiCursor />;
}
