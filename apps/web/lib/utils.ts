import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Valide une URL de redirection post-connexion.
 *
 * Un simple `startsWith('/')` ne suffit pas : `//evil.com` le satisfait tout en
 * étant une URL protocol-relative, que le navigateur résout vers un autre
 * domaine. `/\evil.com` est interprété de la même façon par plusieurs
 * navigateurs. Seul un chemin interne au site est accepté, sinon on retombe sur
 * l'accueil.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw?.startsWith('/')) return '/'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}
