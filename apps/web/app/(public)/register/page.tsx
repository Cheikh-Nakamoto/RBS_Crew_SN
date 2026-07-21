'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const firstName = fd.get('firstName') as string;
    const lastName = fd.get('lastName') as string;
    const phone = fd.get('phone') as string;

    const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:4000';

    try {
      // 1. Register via Go API
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
        }),
      });
      console.log(" =====> REGISTER RESULT =====> \n\n", res, "\n\n Api Url", API_URL);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Erreur lors de l\'inscription');
      }

      // 2. Auto-login after registration
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but login failed — redirect to login
        setStatus('success');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setStatus('success');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Une erreur est survenue');
    }
  }

  const passwordRules = [
    'Au moins 8 caractères',
    'Une majuscule et une minuscule',
    'Un chiffre',
    'Un caractère spécial (!@#$...)',
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(ellipse, oklch(0.65 0.22 18 / 50%) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(ellipse, oklch(0.72 0.19 48 / 60%) 0%, transparent 70%)',
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
                  background: 'linear-gradient(90deg, oklch(0.65 0.22 18), oklch(0.72 0.19 48))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CREW
              </span>
            </span>
          </Link>
          <p className="mt-2 text-white/40 text-sm">Créer un compte</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/10 p-8 space-y-6">
          <h1 className="font-display text-2xl text-white">Inscription</h1>

          {status === 'error' && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">Inscription réussie ! Redirection…</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium text-white/60">
                  Prénom
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Moussa"
                  className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium text-white/60">
                  Nom
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Diop"
                  className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200 text-sm"
                />
              </div>
            </div>
            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-white/60">
                Téléphone <span className="text-red-400">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="+221771234567"
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200 text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/60">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="contact@exemple.sn"
                className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white/60">
                Mot de passe <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200 text-sm"
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
              <ul className="mt-2 space-y-1">
                {passwordRules.map((rule) => (
                  <li key={rule} className="text-[11px] text-white/25 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-600/25"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création en cours…
                </>
              ) : status === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  Compte créé !
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Créer mon compte
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
            onClick={() => signIn('google', { callbackUrl: '/' })}
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
            Déjà un compte ?{' '}
            <Link href="/login" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
              Se connecter
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
