'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * TokenGuard – à monter une fois dans un layout client.
 * Quand le refresh token est expiré (RefreshTokenError),
 * déconnecte l'utilisateur et le redirige vers /login.
 */
export function TokenGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Protection anti-race : évite plusieurs appels signOut simultanés
  const isSigningOut = useRef(false);

  useEffect(() => {
    if (status === 'loading' || isSigningOut.current) return;

    const error = session?.error;
    if (error === 'RefreshTokenError') {
      isSigningOut.current = true;
      signOut({ redirect: false }).then(() => {
        router.replace('/login?reason=session_expired');
      });
    }
  }, [session, status, router]);

  return null;
}
