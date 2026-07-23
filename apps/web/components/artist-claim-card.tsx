'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Palette, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthedFetch } from '@/lib/use-authed-fetch';

/**
 * Permet à un client déjà inscrit de se déclarer artiste RBS.
 *
 * Cocher la case n'accorde aucun droit : elle enregistre une demande qu'un
 * administrateur valide en rattachant le compte à une fiche artiste précise.
 */
export function ArtistClaimCard({
  initialStatus,
  role,
}: {
  initialStatus?: string | null;
  role?: string;
}) {
  const { authedFetch } = useAuthedFetch();
  const { update } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus ?? 'NONE');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  /**
   * Le rôle voyage dans un JWT signé : tant que le token n'est pas réémis, une
   * validation faite côté administration reste invisible ici. `update()` force
   * next-auth à relire le profil depuis l'API et à réécrire le token.
   */
  async function refreshAccess() {
    setRefreshing(true);
    setRefreshError('');
    try {
      const refreshed = await update();
      if (refreshed?.user?.role === 'ARTIST') {
        router.push('/espace-artiste');
        return;
      }
      setRefreshError("Ta demande n'a pas encore été validée. Réessaie plus tard.");
    } catch {
      setRefreshError('Vérification impossible pour le moment. Réessaie dans un instant.');
    } finally {
      setRefreshing(false);
    }
  }

  // Un artiste déjà validé n'a plus rien à demander : il a son espace.
  if (role === 'ARTIST') return null;

  async function submit() {
    setSending(true);
    setError('');
    try {
      const res = await authedFetch('/users/me/artist-claim', {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || null }),
      });
      if (!res.ok) throw new Error("Impossible d'envoyer la demande");
      setStatus('PENDING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSending(false);
    }
  }

  if (status === 'PENDING') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/4 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Clock className="w-4 h-4 text-amber-400" /> Demande d&apos;artiste en cours
        </h2>
        <p className="text-sm text-white/45">
          Un administrateur va vérifier ta demande et rattacher ton compte à ta fiche.
          Une fois validée, ton espace artiste s&apos;ouvre automatiquement — au plus tard
          après quelques minutes de navigation.
        </p>
        <p className="text-sm text-white/45">
          Déjà validé de ton côté ? Rafraîchis ton accès sans attendre :
        </p>

        {refreshError && (
          <p className="flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {refreshError}
          </p>
        )}

        <button
          type="button"
          onClick={refreshAccess}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Vérification…' : 'Actualiser mon accès'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Palette className="w-4 h-4 text-red-400" /> Es-tu un artiste de RBS ?
        </h2>
        <p className="text-sm text-white/45">
          Demande le rattachement à ta fiche d&apos;artiste pour la mettre à jour toi-même :
          biographie, photos, réseaux sociaux et portfolio.
        </p>
      </div>

      {status === 'REJECTED' && (
        <p className="flex items-center gap-2 text-xs text-white/45">
          <AlertCircle className="w-3.5 h-3.5 text-white/30" />
          Ta précédente demande n&apos;a pas été retenue. Tu peux en soumettre une nouvelle.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="artist-note" className="text-xs font-medium text-white/50">
          Nom de scène, discipline… (facultatif, aide à te retrouver)
        </label>
        <input
          id="artist-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. : Mad Zoo — graffiti"
          className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
        />
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={sending}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        <Check className="w-4 h-4" />
        {sending ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </div>
  );
}
