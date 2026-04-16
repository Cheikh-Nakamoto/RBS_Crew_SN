import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/** Routes qui nécessitent une authentification */
const PROTECTED_ROUTES = ['/profile', '/shop/checkout'];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const tokenError = (session as { error?: string } | null)?.error;
  const isTokenExpired = tokenError === 'RefreshTokenError';
  const callbackUrl = encodeURIComponent(nextUrl.pathname);

  // ── Routes Admin ────────────────────────────────────────────────
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!session || isTokenExpired) {
      const reason = isTokenExpired ? '&reason=session_expired' : '';
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}${reason}`, nextUrl)
      );
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
  }

  // ── Routes Protégées (authentification simple) ───────────────────
  const isProtected = PROTECTED_ROUTES.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  if (isProtected) {
    if (!session || isTokenExpired) {
      const reason = isTokenExpired ? '&reason=session_expired' : '';
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}${reason}`, nextUrl)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/shop/checkout/:path*'],
};
