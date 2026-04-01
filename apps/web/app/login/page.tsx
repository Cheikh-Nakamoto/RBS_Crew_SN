'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
      router.push('/');
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
        </div>

        <p className="text-center mt-6 text-sm text-white/30">
          <Link href="/" className="hover:text-white/60 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
