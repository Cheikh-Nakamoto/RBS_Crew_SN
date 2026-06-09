'use client';

import Link from 'next/link';
import { Mail, MapPin, ArrowUpRight } from 'lucide-react';

// Inline SVGs for brand icons removed from lucide-react v1+
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const nav = {
  explore: [
    { href: '/shop',     label: 'Shop' },
    { href: '/crew',     label: 'Le Crew' },
    { href: '/projects', label: 'Projets' },
    { href: '/festival', label: 'Festival' },
    { href: '/press',    label: 'Presse' },
    { href: '/labz',     label: 'RBS Labz' },
  ],
  akademya: [
    { href: 'https://rbsakademya.com/akademya/', label: 'Nos Classes', external: true },
    { href: 'https://rbsakademya.com/formulaire-dinscription/', label: 'Inscriptions', external: true },
    { href: 'https://rbsakademya.com/formulaire-dinscription/#ateliers', label: 'Les Ateliers', external: true },
    { href: 'https://rbsakademya.com/#soutien', label: 'Nous soutenir', external: true },
  ],
};

const socials = [
  {
    href: 'https://www.instagram.com/rbs_akademya/',
    label: 'Instagram',
    icon: InstagramIcon,
  },
  {
    href: 'https://youtube.com/@rbscrew484',
    label: 'YouTube',
    icon: YoutubeIcon,
  },
  {
    href: 'https://www.facebook.com/p/Rbs-Akademya-61559139107788/',
    label: 'Facebook',
    icon: FacebookIcon,
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer 
      className="relative overflow-hidden noise-texture bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/footer_background.png')" }}
    >
      {/* Background dark overlay layer */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none z-0" />

      {/* Brand gradient top edge — RBS palette spectrum */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--rbs-red) 25%, var(--rbs-gold) 50%, var(--rbs-green) 75%, transparent 100%)',
        }}
      />

      {/* Decorative oversized brand mark — bottom-right ghost */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-4 font-display text-[10rem] sm:text-[14rem] lg:text-[18rem] leading-none select-none text-white/[0.025] tracking-tighter uppercase z-[1]"
      >
        RBS
      </span>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-1 space-y-5">
            <Link
              href="/"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/50 rounded"
            >
              <span className="font-display text-2xl tracking-tight text-white uppercase">
                RBS{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, var(--rbs-gold) 0%, var(--rbs-red-light) 100%)',
                  }}
                >
                  CREW
                </span>
              </span>
              <span className="block text-sm text-white/55 font-sans mt-1 italic">
                More than a school — it&apos;s a lifestyle.
              </span>
            </Link>

            {/* Social links — 44px touch targets */}
            <div className="flex items-center gap-2.5">
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group/social w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/65 hover:text-white hover:bg-white/10 hover:border-[var(--rbs-gold)]/50 hover:shadow-[var(--shadow-glow-gold)] active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/60"
                >
                  <Icon className="w-[18px] h-[18px] transition-transform duration-200 group-hover/social:scale-110" />
                </a>
              ))}
            </div>

            {/* Contact info */}
            <div className="space-y-2 pt-1">
              <a
                href="mailto:contact@rbsakademya.com"
                className="flex items-center gap-2 text-sm text-white/65 hover:text-[var(--rbs-gold)] transition-colors duration-200 min-h-[32px]"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                contact@rbsakademya.com
              </a>
              <p className="flex items-center gap-2 text-sm text-white/55">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                Guédiawaye, Dakar — Sénégal
              </p>
            </div>
          </div>

          {/* Explore column */}
          <div className="space-y-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--rbs-gold)]">
              Explorer
            </p>
            <ul className="space-y-2.5">
              {nav.explore.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/65 hover:text-white transition-colors duration-200 link-underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Akademya column */}
          <div className="space-y-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--rbs-gold)]">
              L&apos;Akademya
            </p>
            <ul className="space-y-2.5">
              {nav.akademya.map(({ href, label, external }) => (
                <li key={href}>
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white transition-colors duration-200 link-underline"
                  >
                    {label}
                    {external && <ArrowUpRight className="w-3 h-3 opacity-60" aria-hidden="true" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission column */}
          <div className="space-y-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--rbs-gold)]">
              La Mission
            </p>
            <p className="text-sm text-white/65 leading-relaxed">
              Collectif fondé en 2012 à Dakar. Graffiti, art urbain, sérigraphie, et la première école de graffiti d&apos;Afrique.
            </p>
            <a
              href="https://rbsakademya.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[var(--rbs-gold)] hover:text-white transition-colors duration-200 group/link"
            >
              Visiter l&apos;Akademya
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Bottom bar — brand gradient divider */}
        <div className="mt-14 pt-6 relative">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-px opacity-50 divider-rbs"
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-mono text-white/55 tracking-wider">
              © {year} RBS Crew SN — Tous droits réservés.
            </p>
            <p className="text-xs text-white/45 text-center sm:text-right leading-relaxed max-w-sm">
              Tous les contenus — fresques, œuvres, photos, textes — sont la propriété intellectuelle exclusive du RBS Crew.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
