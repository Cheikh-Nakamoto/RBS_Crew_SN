import { HTTPError } from 'ky';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extrait un message d'erreur lisible depuis une erreur ky HTTPError ou une Error standard.
 * À utiliser dans les catch blocks des server actions.
 */
export async function parseApiError(err: unknown): Promise<string> {
  if (err instanceof HTTPError) {
    const status = err.response.status;
    try {
      const body = (await err.response.json()) as Record<string, unknown>;
      const msg = body?.message ?? body?.error;
      if (typeof msg === 'string' && msg.trim()) return msg;
    } catch {
      // corps non-JSON ou déjà consommé
    }
    const map: Record<number, string> = {
      400: 'Données invalides',
      401: 'Non autorisé',
      403: 'Accès refusé',
      404: 'Élément introuvable',
      409: 'Cet élément existe déjà',
      422: 'Les données envoyées sont incorrectes',
    };
    return map[status] ?? (status >= 500 ? 'Erreur serveur, veuillez réessayer' : `Erreur ${status}`);
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Une erreur est survenue';
}
