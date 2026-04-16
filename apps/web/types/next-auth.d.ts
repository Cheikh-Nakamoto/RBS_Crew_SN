import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    /** Propagé depuis le JWT quand le refresh token est expiré */
    error?: 'RefreshTokenError';
    user: {
      id: string;
      role: string;
      email: string;
      name?: string;
      image?: string;
    };
  }
}
