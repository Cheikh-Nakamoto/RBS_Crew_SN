import { cache } from 'react';
import { auth } from '@/lib/auth';

/**
 * Shared token retrieval for server actions.
 * Throws if no session or access token — caught by action try/catch
 * and surfaced as toast error via ActionResult.
 *
 * Mémoïsé par `cache()` : chaque `auth()` rejoue le callback `jwt`, donc
 * potentiellement une rotation du refresh token. Une action qui appelle ce
 * helper plusieurs fois n'en déclencherait qu'autant de rotations concurrentes.
 */
export const getAdminToken = cache(async (): Promise<string> => {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
});
