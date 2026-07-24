import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/** Routes qui nécessitent une authentification */
const PROTECTED_ROUTES = ['/profile', '/shop/checkout', '/espace-artiste'];

/**
 * Le middleware n'est PAS la frontière de sécurité : il ne voit ni les server
 * actions ni les appels directs à l'API Go. Il évite seulement d'afficher une
 * page à quelqu'un qui n'y a pas accès ; l'autorisation réelle est appliquée
 * par l'API sur chaque requête.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  // Toute erreur portée par la session rend l'accessToken inutilisable — pas
  // seulement l'expiration du refresh token. Un échec d'échange OAuth laisse par
  // exemple une session d'apparence valide, sans aucun token exploitable.
  const authError = session?.error;
  const callbackUrl = encodeURIComponent(nextUrl.pathname);

  /** Renvoie vers la page de connexion en expliquant pourquoi. */
  const toLogin = () => {
    let reason = '';
    if (authError === 'SessionMaxAgeError') reason = '&reason=session_max_age';
    else if (authError === 'GoogleAuthError') reason = '&reason=oauth_failed';
    else if (authError) reason = '&reason=session_expired';
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}${reason}`, nextUrl)
    );
  };

  /**
   * Rôle insuffisant. On ne renvoie pas vers l'accueil sans un mot : un droit
   * accordé côté administration (validation d'une demande d'artiste, promotion)
   * n'apparaît dans la session qu'après réémission du token, et une redirection
   * muette laisserait croire que rien n'a été fait.
   */
  const toRolePending = () =>
    NextResponse.redirect(
      // `from` permet au bouton « Actualiser mon accès » du profil de renvoyer
      // vers la page refusée une fois la session resynchronisée.
      new URL(`/profile?reason=role_pending&from=${callbackUrl}`, nextUrl)
    );

  // ── Routes Admin ────────────────────────────────────────────────
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!session || authError) return toLogin();
    const role = session.user?.role;
    if (role !== 'ADMIN' && role !== 'EDITOR') return toRolePending();
  }

  // ── Espace artiste ──────────────────────────────────────────────
  if (nextUrl.pathname.startsWith('/espace-artiste')) {
    if (!session || authError) return toLogin();
    const role = session.user?.role;
    if (role !== 'ARTIST' && role !== 'ADMIN') return toRolePending();
  }

  // ── Routes Protégées (authentification simple) ───────────────────
  const isProtected = PROTECTED_ROUTES.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  if (isProtected && (!session || authError)) return toLogin();

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/shop/checkout/:path*',
    '/espace-artiste/:path*',
  ],
};
