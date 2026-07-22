/**
 * Base URL de l'API Go — source unique pour tout le frontend.
 *
 * Côté serveur (RSC, server actions, route handlers) : URL absolue du service
 * Docker interne.
 *
 * Côté navigateur : chemin RELATIF uniquement. `INTERNAL_API_URL` et `AUTH_URL`
 * ne sont pas préfixées `NEXT_PUBLIC_`, donc jamais inlinées dans le bundle
 * client — les lire ici donnerait `undefined`. Le fallback `/backend` passe par
 * le rewrite de `next.config.ts`, ce qui garde tous les appels en même origine
 * (indispensable pour que le cookie de panier invité soit transmis).
 */
export const API_BASE =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? '/backend');

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
