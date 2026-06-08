import { auth } from '@/lib/auth';

/**
 * Shared token retrieval for server actions.
 * Throws if no session or access token — caught by action try/catch
 * and surfaced as toast error via ActionResult.
 */
export async function getAdminToken(): Promise<string> {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}
