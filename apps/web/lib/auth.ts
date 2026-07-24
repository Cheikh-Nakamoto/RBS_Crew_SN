import NextAuth, { type NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { API_BASE } from './api-base';

const API_URL = API_BASE;

/**
 * Durée de vie de la session next-auth. Doit rester alignée sur `refreshExpiry`
 * de l'API Go (`internal/service/auth.go`) : un cookie qui survit au refresh
 * token laisse l'utilisateur « connecté » alors que chaque appel API échoue.
 */
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/** Marge avant l'expiration réelle de l'access token (15 min côté API). */
const ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000;

/**
 * Le cookie n'est marqué `Secure` — et donc préfixé — que lorsque le site est
 * servi en HTTPS. Le préfixe `__Host-` interdit l'attribut `Domain` et impose
 * `Path=/` : un sous-domaine compromis ne peut plus écraser le cookie de
 * session. Les navigateurs refusent un cookie `__Host-` sans `Secure`, d'où la
 * bascule sur le nom nu en développement.
 */
const useSecureCookies = (process.env.AUTH_URL ?? '').startsWith('https://');
const sessionCookieName = useSecureCookies
  ? '__Host-authjs.session-token'
  : 'authjs.session-token';

interface ApiTokenPair {
  accessToken: string;
  refreshToken?: string;
}

interface ApiMe {
  id: string;
  email: string;
  role: string;
}

/**
 * Récupère le profil courant depuis l'API Go. Utilisé à la connexion Google et
 * lors d'un rafraîchissement explicite de session (`update()`), pour que le
 * rôle affiché suive celui réellement enregistré en base.
 */
async function fetchMe(accessToken: string): Promise<ApiMe | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiMe;
  } catch {
    return null;
  }
}

/**
 * Rafraîchissements en vol, indexés par refresh token.
 *
 * Un seul rendu Next.js déclenche plusieurs `auth()` indépendants (middleware,
 * layout, puis une fois par requête de données) : sans cette table, tous
 * partiraient avec le même refresh token au même instant. L'API tolère ce cas
 * via une fenêtre de grâce, mais autant ne pas la solliciter inutilement — et
 * cela évite N allers-retours réseau là où un seul suffit.
 *
 * Ne couvre que le processus courant ; c'est bien la fenêtre de grâce côté
 * serveur qui porte la garantie, le middleware et les RSC s'exécutant dans des
 * passes distinctes.
 */
const inflightRefresh = new Map<string, Promise<JWT>>();

async function requestRefresh(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!res.ok) {
      // L'API distingue une session révoquée d'une session ayant atteint sa
      // durée de vie maximale : le message affiché n'est pas le même.
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      return {
        ...token,
        error: body?.code === 'session_max_age' ? 'SessionMaxAgeError' : 'RefreshTokenError',
      };
    }

    const data = (await res.json()) as ApiTokenPair;
    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? token.refreshToken,
      accessTokenExpiry: Date.now() + ACCESS_TOKEN_TTL_MS,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshTokenError' };
  }
}

function refreshAccessToken(token: JWT): Promise<JWT> {
  const key = String(token.refreshToken ?? '');
  if (!key) return Promise.resolve({ ...token, error: 'RefreshTokenError' });

  const pending = inflightRefresh.get(key);
  if (pending) return pending;

  const promise = requestRefresh(token).finally(() => {
    inflightRefresh.delete(key);
  });
  inflightRefresh.set(key, promise);
  return promise;
}

export const authConfig: NextAuthConfig = {
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
        const data = (await res.json()) as { accessToken: string; refreshToken: string };

        const meRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (!meRes.ok) return null;
        const user = (await meRes.json()) as {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          role: string;
        };

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
    async jwt({ token, user, account, trigger }) {
      // Première connexion Google : `user` est bien présent mais ne porte aucun
      // accessToken (ce champ ne vient que du provider Credentials). Sans cet
      // échange, la session serait valide côté next-auth tout en étant refusée
      // par l'API Go sur chaque appel authentifié. Ce cas doit donc être traité
      // AVANT la branche générique `if (user)`.
      if (account?.provider === 'google' && account.id_token) {
        try {
          const res = await fetch(`${API_URL}/auth/oauth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          });
          if (!res.ok) {
            token.error = 'GoogleAuthError';
            return token;
          }
          const data = (await res.json()) as ApiTokenPair;
          const me = await fetchMe(data.accessToken);

          token.accessToken = data.accessToken;
          token.refreshToken = data.refreshToken;
          token.role = me?.role ?? 'CUSTOMER';
          token.userId = me?.id;
          token.accessTokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
          token.error = undefined;
        } catch {
          token.error = 'GoogleAuthError';
        }
        return token;
      }

      if (user) {
        const u = user as typeof user & {
          accessToken: string;
          refreshToken: string;
          role: string;
          id: string;
        };
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.role = u.role;
        token.userId = u.id;
        token.accessTokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
        return token;
      }

      // Rafraîchissement explicite demandé par le client via `update()`.
      // Le rôle vit dans un JWT signé : un droit accordé côté administration
      // (validation d'une demande d'artiste, promotion) n'y apparaît pas tant
      // que le token n'a pas été réémis. On relit donc le profil à la source.
      if (trigger === 'update' && token.accessToken) {
        const me = await fetchMe(token.accessToken as string);
        if (me) {
          token.role = me.role;
          token.userId = me.id;
        }
        return token;
      }

      // Access token encore valide
      if (Date.now() < ((token.accessTokenExpiry as number) ?? 0)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      session.user.id = token.userId as string;
      // Expose token error to the client so it can redirect to /login
      if (token.error) {
        session.error = token.error as NonNullable<typeof session.error>;
      }
      return session;
    },
  },
  events: {
    /**
     * `signOut` côté next-auth n'efface que le cookie du navigateur. Sans cet
     * appel, la session reste vivante côté API — refresh token valide plusieurs
     * jours — et « se déconnecter » ne déconnecte donc de rien.
     *
     * Un échec réseau ne doit pas empêcher la déconnexion locale : on
     * journalise et on laisse next-auth effacer le cookie.
     */
    async signOut(message) {
      const token = 'token' in message ? message.token : null;
      const accessToken = (token as JWT | null)?.accessToken as string | undefined;
      if (!accessToken) return;
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (err) {
        console.error('[auth] server-side logout failed', err);
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  // Auth.js v5 refuse par défaut toute requête dont l'hôte n'est pas vérifié et
  // répond 400 sur /api/auth/session — sauf auto-détection Vercel. Derrière le
  // reverse-proxy Nginx/Docker de prod, l'hôte arrive via X-Forwarded-Host et
  // n'est pas « de confiance » sans ce flag. Sûr sur Vercel (no-op) comme en
  // self-hosted. `AUTH_SECRET` reste requis pour signer/vérifier les JWT.
  trustHost: true,
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
