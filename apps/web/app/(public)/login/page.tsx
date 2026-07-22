'use client';
import { useState, Suspense } from 'react';
import { getSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Récupérer et valider le callbackUrl (uniquement URLs relatives du même site)
  const rawCallback = searchParams.get('callbackUrl') ?? '/';
  const callbackUrl = rawCallback.startsWith('/') ? rawCallback : '/';
  const sessionExpired = searchParams.get('reason') === 'session_expired';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setStatus('error');
      setErrorMsg('Email ou mot de passe incorrect.');
    } else {
      // Sans destination explicite, on emmène chacun chez lui : un artiste sur
      // son espace, un administrateur sur le back-office.
      let destination = callbackUrl;
      if (destination === '/') {
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (role === 'ARTIST') destination = '/espace-artiste';
        else if (role === 'ADMIN' || role === 'EDITOR') destination = '/admin';
      }
      router.push(destination);
      router.refresh();
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15"
        style={{
          background:
            'radial-gradient(ellipse, oklch(0.72 0.19 48 / 50%) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full opacity-10"
        style={{
          background:
            'radial-gradient(ellipse, oklch(0.60 0.25 345 / 60%) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="font-display text-3xl text-white tracking-tight">
              RBS{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, oklch(0.88 0.18 90), oklch(0.72 0.19 48))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CREW
              </span>
            </span>
          </Link>
          <p className="mt-2 text-white/40 text-sm">Connexion à votre espace</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/10 p-8 space-y-6">
          <h1 className="font-display text-2xl text-white">Bienvenue</h1>

          {sessionExpired && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">Votre session a expiré. Veuillez vous reconnecter.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/60">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="contact@exemple.sn"
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.19_48/60%)] focus:border-[oklch(0.72_0.19_48/40%)] transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.19_48/60%)] focus:border-[oklch(0.72_0.19_48/40%)] transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm hover:bg-[oklch(0.80_0.19_48)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[oklch(0.72_0.19_48/25%)]"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white/6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-sm font-semibold text-white/80 hover:text-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-white/30">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
              Créer un compte
            </Link>
          </p>
          <p className="text-sm text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
