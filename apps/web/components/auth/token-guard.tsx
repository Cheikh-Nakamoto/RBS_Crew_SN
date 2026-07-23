'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Motif de redirection associé à chaque cause d'invalidité, pour que la page de
 * connexion dise ce qui s'est réellement passé. Afficher « votre session a
 * expiré » à quelqu'un dont la connexion Google vient d'échouer l'enverrait
 * chercher au mauvais endroit.
 */
const REASON_BY_ERROR: Record<string, string> = {
  RefreshTokenError: 'session_expired',
  SessionMaxAgeError: 'session_max_age',
  GoogleAuthError: 'oauth_failed',
};

/**
 * TokenGuard – à monter une fois dans un layout client.
 * Dès que la session porte une erreur (refresh expiré, durée de vie maximale
 * atteinte, échec de l'échange OAuth), déconnecte et redirige vers /login.
 */
export function TokenGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Protection anti-race : évite plusieurs appels signOut simultanés
  const isSigningOut = useRef(false);

  useEffect(() => {
    if (status === 'loading' || isSigningOut.current) return;

    const reason = session?.error ? REASON_BY_ERROR[session.error] : undefined;
    if (!reason) return;

    isSigningOut.current = true;
    signOut({ redirect: false }).then(() => {
      router.replace(`/login?reason=${reason}`);
    });
  }, [session, status, router]);

  return null;
}
