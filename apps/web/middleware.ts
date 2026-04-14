import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  if (nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${nextUrl.pathname}`, nextUrl)
      );
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
