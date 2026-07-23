import 'next-auth';
import 'next-auth/jwt';

/**
 * Causes possibles d'une session inutilisable :
 * - `RefreshTokenError` : refresh token expiré, révoqué ou réutilisé
 * - `SessionMaxAgeError` : durée de vie absolue atteinte, ré-authentification exigée
 * - `GoogleAuthError` : l'échange de l'id_token Google contre des tokens API a échoué
 */
type AuthErrorCode = 'RefreshTokenError' | 'SessionMaxAgeError' | 'GoogleAuthError';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    /** Propagé depuis le JWT quand la session n'est plus exploitable */
    error?: AuthErrorCode;
    user: {
      id: string;
      role: string;
      email: string;
      name?: string;
      image?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiry?: number;
    role?: string;
    userId?: string;
    error?: AuthErrorCode;
  }
}
