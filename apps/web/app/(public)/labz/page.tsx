'use client';
import { useState } from 'react';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/utils';
import {
  Printer,
  PaintBucket,
  Sparkles,
  GraduationCap,
  Eye,
  HelpCircle,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react';
import { apiUrl } from '@/lib/api-base';

const ORDER_TYPES = [
  { label: 'Sérigraphie',           icon: Printer },
  { label: 'Fresque murale',        icon: PaintBucket },
  { label: 'Graffiti live',         icon: Sparkles },
  { label: 'Formation',             icon: GraduationCap },
  { label: 'Direction artistique',  icon: Eye },
  { label: 'Autre',                 icon: HelpCircle },
];

export default function LabzPage() {
  const [status, setStatus]         = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [orderType, setOrderType]   = useState('');

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orderType) return;
    setStatus('loading');
    setErrorMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      name:      formData.get('name'),
      surname:   formData.get('surname'),
      email:     formData.get('email'),
      phone:     formData.get('phone')   || undefined,
      company:   formData.get('company') || undefined,
      orderType,
      message:   formData.get('message'),
    };

    try {
      const res = await fetch(apiUrl('/quotes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Erreur serveur');
      }
      setStatus('success');
      setOrderType('');
      form.reset();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatus('error');
    }
  }

  // ── Input helper ─────────────────────────────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.19_48/50%)] focus:border-[oklch(0.72_0.19_48/30%)] transition-all duration-200';
  const labelClass = 'block text-sm font-medium text-white/60 mb-1.5';

  // ── Success screen ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-[oklch(0.65_0.20_140/15%)] border border-[oklch(0.65_0.20_140/30%)] flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[oklch(0.75_0.15_140)]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-3xl text-white">Demande envoyée !</h2>
          <p className="text-white/50">Nous vous répondrons sous 48h à l&apos;adresse fournie.</p>
        </div>
        <button
          onClick={() => setStatus('idle')}
          className="px-6 py-3 rounded-xl bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm hover:bg-[oklch(0.80_0.19_48)] transition-all duration-200"
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 pb-12">
      <SectionHeader
        eyebrow="Collaboration B2B"
        title="RBS Labz"
        subtitle="Faites appel au savoir-faire du RBS Crew pour vos projets professionnels — sérigraphie, fresques, live art."
        className="mb-12"
      />

      <form
        onSubmit={handleSubmit}
        className="glass rounded-2xl border border-white/10 p-6 sm:p-8 space-y-6"
      >
        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className={labelClass}>Prénom *</label>
            <input id="name" name="name" required placeholder="Aminata" className={inputClass} />
          </div>
          <div>
            <label htmlFor="surname" className={labelClass}>Nom *</label>
            <input id="surname" name="surname" required placeholder="Diallo" className={inputClass} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="contact@entreprise.sn"
            className={inputClass}
          />
        </div>

        {/* Phone + Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={labelClass}>Téléphone</label>
            <input id="phone" name="phone" type="tel" placeholder="+221 77 000 00 00" className={inputClass} />
          </div>
          <div>
            <label htmlFor="company" className={labelClass}>Entreprise</label>
            <input id="company" name="company" placeholder="Ma Société SA" className={inputClass} />
          </div>
        </div>

        {/* Order type — icon chips */}
        <div>
          <p className={labelClass}>Type de commande *</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {ORDER_TYPES.map(({ label, icon: Icon }) => {
              const selected = orderType === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setOrderType(label)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left',
                    selected
                      ? 'bg-[oklch(0.72_0.19_48/15%)] border-[oklch(0.72_0.19_48/50%)] text-white'
                      : 'bg-white/4 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      selected ? 'text-[oklch(0.72_0.19_48)]' : 'text-white/30',
                    )}
                  />
                  <span className="text-xs text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className={labelClass}>Description du projet *</label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder="Décrivez votre projet, dimensions, délais, budget indicatif…"
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        {/* Error message */}
        {status === 'error' && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !orderType}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-200',
            'bg-[oklch(0.72_0.19_48)] text-black hover:bg-[oklch(0.80_0.19_48)]',
            'shadow-lg shadow-[oklch(0.72_0.19_48/20%)] hover:shadow-[oklch(0.72_0.19_48/35%)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {status === 'loading' ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Envoyer la demande
            </>
          )}
        </button>
      </form>
    </div>
  );
}
