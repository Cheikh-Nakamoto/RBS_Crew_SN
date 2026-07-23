'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MailCheck, XCircle, Loader2 } from 'lucide-react';
import { verifyEmail } from './actions';

const primaryBtn =
  'px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
const secondaryBtn =
  'px-5 py-3 rounded-xl bg-white/6 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors';

export function VerifyForm({ token }: { token?: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'failed'>(
    token ? 'idle' : 'failed'
  );
  const [message, setMessage] = useState(
    token ? '' : 'Ce lien de vérification est incomplet. Utilisez le lien reçu par e-mail.'
  );

  async function submit() {
    setState('pending');
    const result = await verifyEmail(token ?? '');
    if (result.ok) {
      setState('done');
      return;
    }
    setMessage(result.message);
    setState('failed');
  }

  if (state === 'done') {
    return (
      <>
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
        <h1 className="font-display text-2xl text-white">Adresse vérifiée</h1>
        <p className="text-sm text-white/50">
          Merci ! Votre adresse e-mail est confirmée : vous pouvez désormais passer commande.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/shop" className={primaryBtn}>
            Aller à la boutique
          </Link>
          <Link href="/profile" className={secondaryBtn}>
            Mon profil
          </Link>
        </div>
      </>
    );
  }

  if (state === 'failed') {
    return (
      <>
        <XCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="font-display text-2xl text-white">Vérification impossible</h1>
        <p className="text-sm text-white/50">{message}</p>
        <p className="text-xs text-white/35">
          Depuis votre profil, vous pouvez demander l&apos;envoi d&apos;un nouveau lien.
        </p>
        <div className="pt-2">
          <Link href="/profile" className={`inline-block ${secondaryBtn}`}>
            Aller à mon profil
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <MailCheck className="w-10 h-10 text-white/50 mx-auto" />
      <h1 className="font-display text-2xl text-white">Confirmer votre adresse</h1>
      <p className="text-sm text-white/50">
        Dernière étape : validez votre adresse e-mail pour pouvoir passer commande.
      </p>
      <div className="pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={state === 'pending'}
          className={`inline-flex items-center gap-2 ${primaryBtn}`}
        >
          {state === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
          {state === 'pending' ? 'Vérification…' : 'Confirmer mon adresse'}
        </button>
      </div>
    </>
  );
}
