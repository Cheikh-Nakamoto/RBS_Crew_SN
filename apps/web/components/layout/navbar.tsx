'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  ShoppingBag,
  Users,
  Layers,
  Music,
  Newspaper,
  Beaker,
  LogIn,
  LogOut,
} from 'lucide-react';

const links = [
  { href: '/shop',     label: 'Shop',     icon: ShoppingBag },
  { href: '/crew',     label: 'Crew',     icon: Users },
  { href: '/projects', label: 'Projects', icon: Layers },
  { href: '/festival', label: 'Festival', icon: Music },
  { href: '/press',    label: 'Presse',   icon: Newspaper },
  { href: '/labz',     label: 'Labz',     icon: Beaker },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Detect scroll for navbar elevation
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background/90 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl tracking-tight text-white group flex items-center gap-1"
          >
            <span className="transition-all duration-300 group-hover:text-white/80">RBS</span>
            <span
              className="text-gradient-orange transition-all duration-300 group-hover:opacity-90"
              style={{ WebkitTextFillColor: 'unset' }}
            >
              {' '}CREW
            </span>
            <span className="ml-1 tag-graffiti scale-75 opacity-80">SN</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Navigation principale">
            {links.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:text-white hover:bg-white/8',
                    active
                      ? 'text-white bg-white/8'
                      : 'text-white/55',
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-[oklch(0.72_0.19_48)] to-[oklch(0.60_0.25_345)] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth + hamburger */}
          <div className="flex items-center gap-2">
            {session ? (
              <button
                onClick={() => signOut()}
                className={cn(
                  'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                  'text-white/60 hover:text-white hover:bg-white/8 transition-all duration-200',
                )}
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            ) : (
              <Link
                href="/login"
                className={cn(
                  'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                  'border border-white/15 text-white/70 hover:text-white hover:border-white/30',
                  'hover:bg-white/5 transition-all duration-200',
                )}
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
              </Link>
            )}

            {/* Hamburger — mobile only */}
            <button
              className={cn(
                'md:hidden p-2 rounded-lg transition-all duration-200',
                'text-white/70 hover:text-white hover:bg-white/8',
                mobileOpen && 'bg-white/8 text-white',
              )}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
            >
              <span className="relative w-5 h-5 flex items-center justify-center">
                <Menu
                  className={cn(
                    'absolute w-5 h-5 transition-all duration-300',
                    mobileOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
                  )}
                />
                <X
                  className={cn(
                    'absolute w-5 h-5 transition-all duration-300',
                    mobileOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <nav
        aria-label="Navigation mobile"
        className={cn(
          'fixed top-16 left-0 right-0 z-40 md:hidden',
          'bg-background/95 backdrop-blur-xl border-b border-white/8',
          'transition-all duration-300 overflow-hidden',
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }, i) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{ animationDelay: `${i * 50}ms` }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                  active
                    ? 'bg-[oklch(0.72_0.19_48/15%)] text-white border border-[oklch(0.72_0.19_48/30%)]'
                    : 'text-white/65 hover:text-white hover:bg-white/6',
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-[oklch(0.72_0.19_48)]' : 'text-white/40')} />
                {label}
              </Link>
            );
          })}

          <div className="border-t border-white/8 mt-2 pt-2">
            {session ? (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/60 hover:text-white hover:bg-white/6 transition-all"
              >
                <LogOut className="w-5 h-5 text-white/40" />
                Déconnexion
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all"
              >
                <LogIn className="w-5 h-5 text-white/40" />
                Connexion
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
