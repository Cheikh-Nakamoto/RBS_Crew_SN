'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart-store';
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
  UserPlus,
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
  const { count, setIsOpen: openCart } = useCart();
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
          'fixed w-full top-0 z-50 transition-all duration-300',
          scrolled ? 'bg-black/90 shadow-lg' : 'bg-transparent'
        )}
      >
        <div className="max-w-[90rem] mx-auto px-6 h-20 flex flex-col justify-end pb-4 border-b border-white/20">
          <div className="flex items-center justify-between relative">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group relative z-10 w-48">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span className="font-display font-bold tracking-[0.2em] text-white uppercase text-sm">
                RBS CREW
              </span>
              {/* Red Line extending from logo like in maquette */}
              <span className="absolute -bottom-[17px] left-0 w-32 h-[2px] bg-red-600"></span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2" aria-label="Navigation principale">
              <Link href="/" className={cn('text-xs font-semibold tracking-wider transition-colors uppercase', pathname === '/' ? 'text-white' : 'text-white/60 hover:text-white')}>
                Home
              </Link>
              {links.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'text-xs font-semibold tracking-wider transition-colors uppercase',
                      active ? 'text-white' : 'text-white/60 hover:text-white'
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Cart + Auth / Hamburger */}
            <div className="flex items-center gap-4 z-10 w-48 justify-end">
              {/* Cart icon */}
              <button
                onClick={() => openCart(true)}
                className="relative p-1.5 text-white/70 hover:text-white transition-colors"
                aria-label="Ouvrir le panier"
              >
                <ShoppingBag className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none animate-pulse">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>

              {session ? (
                <>
                  <Link
                    href="/profile"
                    className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Profil
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors uppercase tracking-wider"
                  >
                    Inscription
                  </Link>
                </>
              )}
              
              <button
                className="md:hidden p-1 text-white/80 hover:text-white"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
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
                <Icon className={cn('w-5 h-5', active ? 'text-[oklch(0.65_0.18_18)]' : 'text-white/40')} />
                {label}
              </Link>
            );
          })}

          <div className="border-t border-white/8 mt-2 pt-2">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all"
                >
                  <LogIn className="w-5 h-5 text-white/40" />
                  Mon profil
                </Link>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/60 hover:text-white hover:bg-white/6 transition-all"
                >
                  <LogOut className="w-5 h-5 text-white/40" />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all"
                >
                  <LogIn className="w-5 h-5 text-white/40" />
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-600/10 transition-all"
                >
                  <UserPlus className="w-5 h-5 text-red-400/60" />
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
