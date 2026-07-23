'use server';

import { API_BASE } from '@/lib/api-base';

export interface VerifyEmailResult {
  ok: boolean;
  message: string;
}

/**
 * Consomme le jeton de vérification d'adresse e-mail.
 *
 * Volontairement une Server Action (donc un POST déclenché par un clic) et non
 * un effet de rendu : les scanners de liens des messageries — Microsoft Safe
 * Links, antivirus de passerelle — visitent en GET toutes les URL contenues
 * dans un e-mail avant livraison. Consommer le jeton pendant le rendu le
 * grillerait avant que le destinataire ne clique, et celui-ci recevrait
 * « lien invalide » pour un lien parfaitement légitime.
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  if (!token) {
    return {
      ok: false,
      message: 'Ce lien de vérification est incomplet. Utilisez le lien reçu par e-mail.',
    };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (res.ok) return { ok: true, message: '' };

    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: body?.message ?? 'Ce lien est invalide ou a expiré.' };
  } catch {
    return {
      ok: false,
      message: 'Le service de vérification est momentanément indisponible. Réessayez.',
    };
  }
}
