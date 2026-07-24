'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, Check, AlertCircle, Mail, MapPin, AtSign } from 'lucide-react';
import { apiUrl } from '@/lib/api-base';
import { SectionHeader } from '@/components/ui/section-header';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const ORDER_TYPES = [
  'Fresque / mur',
  'Atelier / workshop',
  'Événement / festival',
  'Merchandising / print',
  'Presse / partenariat',
  'Autre',
] as const;

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim();
    const email = (fd.get('email') as string)?.trim();
    const orderType = fd.get('orderType') as string;
    const message = (fd.get('message') as string)?.trim();
    const phone = (fd.get('phone') as string)?.trim();
    const company = (fd.get('company') as string)?.trim();

    if (!name || !email || !orderType || !message) {
      setStatus('error');
      setErrorMsg('Merci de renseigner le nom, l\'email, le type de projet et le message.');
      return;
    }

    try {
      const res = await fetch(apiUrl('/quotes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          orderType,
          message,
          phone: phone || undefined,
          company: company || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Impossible d\'envoyer votre message pour le moment.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  }

  return (
    <div
      id="main-content"
      className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16"
    >
      <ScrollReveal>
        <SectionHeader
          eyebrow="RBS Crew SN"
          title="Collaborer"
          subtitle="Un mur, un atelier, un événement ou un projet à monter ensemble ? Écris-nous, on revient vers toi rapidement."
          className="mb-12"
        />
      </ScrollReveal>

      {status === 'success' ? (
        <ScrollReveal>
          <div className="rounded-2xl bg-[var(--rbs-green)]/10 ring-1 ring-[var(--rbs-green)]/30 p-8 sm:p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rbs-green)]/15 ring-1 ring-[var(--rbs-green)]/40">
              <Check className="h-7 w-7 text-[var(--rbs-green)]" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl uppercase tracking-tight text-white mb-2">
              Message envoyé
            </h2>
            <p className="text-white/65 leading-relaxed mb-6 text-balance">
              Merci pour ta prise de contact. L&apos;équipe RBS revient vers toi par email très vite.
            </p>
            <Button asChild variant="outline-neon" className="min-h-[44px]">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </ScrollReveal>
      ) : (
        <ScrollReveal>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {status === 'error' && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-destructive/10 ring-1 ring-destructive/30 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom <span className="text-[var(--rbs-red)]">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  className="min-h-[44px]"
                  placeholder="Ton nom ou celui de ta structure"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-[var(--rbs-red)]">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="min-h-[44px]"
                  placeholder="toi@exemple.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="min-h-[44px]"
                  placeholder="+221 …"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Structure / entreprise</Label>
                <Input
                  id="company"
                  name="company"
                  autoComplete="organization"
                  className="min-h-[44px]"
                  placeholder="Facultatif"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderType">
                Type de projet <span className="text-[var(--rbs-red)]">*</span>
              </Label>
              <select
                id="orderType"
                name="orderType"
                required
                defaultValue=""
                className="flex min-h-[44px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  Choisis un type…
                </option>
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-[var(--rbs-red)]">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                required
                rows={6}
                className="resize-y"
                placeholder="Décris ton projet, tes contraintes, tes dates…"
              />
            </div>

            <Button
              type="submit"
              variant="solid-premium"
              disabled={status === 'loading'}
              className="w-full min-h-[48px] gap-2"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {status === 'loading' ? 'Envoi…' : 'Envoyer le message'}
            </Button>
          </form>
        </ScrollReveal>
      )}

      <ScrollReveal>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <a
            href="mailto:contact@rbsakademya.com"
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-3 min-h-[44px] hover:ring-[var(--rbs-gold)]/40 transition"
          >
            <Mail className="h-4 w-4 text-[var(--rbs-gold)] flex-shrink-0" aria-hidden="true" />
            <span className="text-white/75">contact@rbsakademya.com</span>
          </a>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-3 min-h-[44px]">
            <MapPin className="h-4 w-4 text-[var(--rbs-red)] flex-shrink-0" aria-hidden="true" />
            <span className="text-white/75">Dakar, Sénégal</span>
          </div>
          <a
            href="https://instagram.com/rbscrew"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-3 min-h-[44px] hover:ring-[var(--rbs-gold)]/40 transition"
          >
            <AtSign className="h-4 w-4 text-[var(--rbs-green)] flex-shrink-0" aria-hidden="true" />
            <span className="text-white/75">@rbscrew</span>
          </a>
        </div>
      </ScrollReveal>
    </div>
  );
}
