'use client';

import { useCallback, useEffect, useState } from 'react';
import { MailWarning, Check, Loader2 } from 'lucide-react';
import { useAuthedFetch } from '@/lib/use-authed-fetch';

/**
 * Bandeau affiché au checkout tant que l'adresse n'est pas vérifiée.
 *
 * Le blocage réel est côté serveur (`POST /orders` répond 403 `email_not_verified`) :
 * ce composant évite seulement au client un aller-retour inutile, et lui donne
 * le moyen de se débloquer.
 *
 * Rend `null` tant que l'état n'est pas connu ou si l'adresse est vérifiée.
 */
export function EmailVerificationNotice({
  onStatusChange,
}: {
  onStatusChange?: (verified: boolean) => void;
}) {
  const { authedFetch } = useAuthedFetch();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/users/me');
      if (!res.ok) return;
      const me = (await res.json()) as { emailVerified?: boolean };
      const v = me.emailVerified ?? false;
      setVerified(v);
      onStatusChange?.(v);
    } catch {
      // Indéterminé : on n'affiche rien, le serveur reste l'autorité.
    }
  }, [authedFetch, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resend() {
    setSending(true);
    setError('');
    try {
      const res = await authedFetch('/auth/resend-verification', { method: 'POST' });
      if (!res.ok) throw new Error("L'envoi a échoué. Réessayez dans quelques instants.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSending(false);
    }
  }

  if (verified !== false) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <MailWarning className="w-4 h-4" /> Vérifiez votre adresse e-mail
      </h2>
      <p className="text-xs text-white/60 leading-relaxed">
        Pour des raisons de sécurité, une commande ne peut être passée qu&apos;avec une
        adresse e-mail confirmée. Ouvrez le lien que nous vous avons envoyé.
      </p>

      {sent ? (
        <p className="flex items-center gap-2 text-xs text-green-300">
          <Check className="w-3.5 h-3.5" /> Nouvel e-mail envoyé. Pensez à regarder vos spams.
        </p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/8 border border-white/15 text-xs font-semibold text-white/85 hover:bg-white/12 disabled:opacity-60 transition-colors"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Renvoyer l&apos;e-mail de vérification
        </button>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
