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
// Côté serveur, l'URL DOIT être absolue (ky/fetch n'ont pas d'origine à
// résoudre pendant le prerender). NEXT_PUBLIC_API_URL vaut `/backend` en prod
// (rewrite navigateur same-origin) : cette valeur relative est correcte pour
// le client mais inutilisable côté serveur, on l'ignore donc si elle ne
// commence pas par http.
const isAbsolute = (v: string | undefined): v is string => !!v && /^https?:\/\//.test(v);

function serverApiBase(): string {
  if (isAbsolute(process.env.INTERNAL_API_URL)) return process.env.INTERNAL_API_URL;
  if (isAbsolute(process.env.NEXT_PUBLIC_API_URL)) return process.env.NEXT_PUBLIC_API_URL;
  return 'http://localhost:4000';
}

export const API_BASE =
  typeof window === 'undefined'
    ? serverApiBase()
    : (process.env.NEXT_PUBLIC_API_URL ?? '/backend');

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
