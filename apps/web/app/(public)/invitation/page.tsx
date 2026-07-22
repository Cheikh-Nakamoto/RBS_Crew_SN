'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { apiUrl } from '@/lib/api-base';

const PASSWORD_RULES = [
  'Au moins 8 caractères',
  'Une majuscule et une minuscule',
  'Un chiffre',
  'Un caractère spécial (!@#$…)',
];

function InvitationForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    const confirm = fd.get('confirm') as string;

    if (password !== confirm) {
      setStatus('error');
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(apiUrl('/auth/accept-invitation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Ce lien d'invitation est invalide ou expiré.");
      }

      // Le compte est activé : on ouvre la session next-auth avec le mot de
      // passe qui vient d'être défini, puis on emmène l'artiste chez lui.
      const activated = (await res.json()) as { email: string };
      await signIn('credentials', {
        email: activated.email,
        password,
        redirect: false,
      });

      setStatus('success');
      setTimeout(() => {
        router.push('/espace-artiste');
        router.refresh();
      }, 800);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-2xl border border-white/10 p-8 space-y-3 text-center">
        <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
        <p className="text-sm text-white/70">
          Ce lien d&apos;invitation est incomplet. Utilisez le lien reçu par e-mail.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-white">Activer mon espace artiste</h1>
        <p className="text-sm text-white/40">
          Choisissez un mot de passe pour accéder à votre fiche.
        </p>
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{errorMsg}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300">Compte activé ! Redirection…</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-white/60">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => (
              <li key={rule} className="text-[11px] text-white/25 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/20" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-white/60">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Activation…</>
          ) : (
            <><UserPlus className="w-4 h-4" /> Activer mon compte</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-white/30">
        <Link href="/" className="hover:text-white/60 transition-colors">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          }
        >
          <InvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
