import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }), 
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json() as { accessToken: string; refreshToken: string };

        const meRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (!meRes.ok) return null;
        const user = await meRes.json() as { id: string; email: string; firstName?: string; lastName?: string; role: string };

        return {
          ...user,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { accessToken: string; refreshToken: string; role: string; id: string };
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.role = u.role;
        token.userId = u.id;
        // Store expiry: access token is valid for 15 minutes
        token.accessTokenExpiry = Date.now() + 14 * 60 * 1000;
        return token;
      }

      // Access token still valid
      if (Date.now() < (token.accessTokenExpiry as number ?? 0)) {
        return token;
      }

      // Attempt refresh
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: token.refreshToken }),
        });
        if (res.ok) {
          const data = await res.json() as { accessToken: string; refreshToken?: string };
          token.accessToken = data.accessToken;
          token.refreshToken = data.refreshToken ?? token.refreshToken;
          token.accessTokenExpiry = Date.now() + 14 * 60 * 1000;
          token.error = undefined;
        } else {
          token.error = 'RefreshTokenError';
        }
      } catch {
        token.error = 'RefreshTokenError';
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      session.user.id = token.userId as string;
      // Expose token error to the client so it can redirect to /login
      if (token.error) {
        session.error = token.error as 'RefreshTokenError';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
});
