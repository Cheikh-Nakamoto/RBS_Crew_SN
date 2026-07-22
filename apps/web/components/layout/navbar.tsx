'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/crew', label: 'Crew', icon: Users },
  { href: '/projects', label: 'Projects', icon: Layers },
  { href: '/festival', label: 'Festival', icon: Music },
  { href: '/press', label: 'Presse', icon: Newspaper },
  { href: '/labz', label: 'Labz', icon: Beaker },
];

// Framer Motion v12 : ease doit être un tuple [n,n,n,n], pas number[]
const EASE_OUT = [0, 0, 0.2, 1] as [number, number, number, number];
const EASE_IN = [0.4, 0, 1, 1] as [number, number, number, number];

const drawerVariants: Variants = {
  closed: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_IN } },
  open: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

const itemVariants: Variants = {
  closed: { opacity: 0, x: -12 },
  open: { opacity: 1, x: 0 },
};

// Desktop nav link with animated brand-gradient underline
function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'group/nav relative text-xs font-bold tracking-[0.18em] uppercase py-1.5 transition-colors duration-200 focus-visible:outline-none',
        active ? 'text-white' : 'text-white/65 hover:text-white'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -bottom-0.5 left-0 h-[2px] origin-left transition-transform duration-300 ease-out',
          active
            ? 'w-full scale-x-100 bg-[var(--rbs-red)]'
            : 'w-full scale-x-0 group-hover/nav:scale-x-100 bg-gradient-to-r from-[var(--rbs-red)] via-[var(--rbs-gold)] to-[var(--rbs-green)]'
        )}
      />
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isArtist = (session?.user as { role?: string } | undefined)?.role === 'ARTIST';
  const { count, setIsOpen: openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navId = useId();
  const mobileNavId = `mobile-nav-${navId}`;

  // Fermer le menu à chaque navigation. Ajustement d'état pendant le rendu
  // (pattern documenté par React) plutôt qu'un effet : il n'y a aucun système
  // externe à synchroniser ici.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Focus trap + Escape key for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = document.getElementById(mobileNavId);
    if (!drawer) return;

    const focusables = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, mobileNavId]);

  return (
    <>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:px-4 focus-visible:py-2 focus-visible:bg-[var(--rbs-red)] focus-visible:text-white focus-visible:rounded-lg focus-visible:font-semibold focus-visible:text-sm"
      >
        Aller au contenu
      </a>

      <header
        className={cn(
          'fixed w-full top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300',
          scrolled || pathname !== '/'
            ? 'bg-black/80 shadow-[0_1px_0_oklch(1_0_0/8%),0_8px_24px_oklch(0_0_0/40%)] backdrop-blur-2xl backdrop-saturate-150'
            : 'bg-transparent'
        )}
      >
        {/* Top-edge brand gradient line — only when scrolled */}
        {(scrolled || pathname !== '/') && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-px opacity-60"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, var(--rbs-red) 30%, var(--rbs-gold) 50%, var(--rbs-green) 70%, transparent 100%)',
            }}
          />
        )}

        {/* ── h-16 = 64px, inner div relative pour positionner la nav absolue ── */}
        <div className="max-w-[90rem] mx-auto px-6 border-b border-white/8">
          <div className="relative h-16 flex items-center justify-between">

            {/* Logo with shimmer */}
            <Link
              href="/"
              className="flex items-center gap-2 group relative z-10 shrink-0 transition-transform hover:scale-105 duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-full"
              aria-label="RBS Crew SN — accueil"
            >
              <div className="bg-white rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center ring-1 ring-white/10 w-[55px] h-[55px] md:w-[63px] md:h-[63px] transition-all relative overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="RBS CREW"
                  width={144}
                  height={44}
                  className="object-cover object-center h-full w-full scale-125 pt-1"
                  priority
                />
                {/* Shimmer sweep on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-out bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
              </div>
            </Link>

            {/* Desktop nav — centré absolument dans le div relative */}
            <nav
              className="hidden md:flex items-center gap-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              aria-label="Navigation principale"
            >
              <NavLink href="/" label="Home" active={pathname === '/'} />
              {links.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  active={pathname.startsWith(href)}
                />
              ))}
            </nav>

            {/* Right side — cart + auth + hamburger */}
            <div className="flex items-center gap-3 z-10 shrink-0">
              {/* Cart */}
              <button
                onClick={() => openCart(true)}
                className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Ouvrir le panier${count > 0 ? ` (${count} article${count > 1 ? 's' : ''})` : ''}`}
              >
                <ShoppingBag className="w-5 h-5" />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key="cart-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="absolute top-0.5 right-0.5 bg-[var(--rbs-red)] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-[0_0_8px_var(--rbs-red)]"
                    >
                      {count > 9 ? '9+' : count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Auth — desktop */}
              {session ? (
                <>
                  {isArtist && (
                    <Link
                      href="/espace-artiste"
                      className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider min-h-[44px]"
                    >
                      Mon espace
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider min-h-[44px]"
                  >
                    Profil
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:flex items-center text-xs font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-wider min-h-[44px]"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="hidden md:flex items-center gap-2 text-xs font-semibold px-4 py-2 min-h-[44px] rounded-lg bg-[var(--rbs-red)] hover:bg-[var(--rbs-red-light)] shadow-[var(--shadow-glow-red)] hover:shadow-[var(--shadow-glow-red-strong)] text-white transition-all uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-red)]/60"
                  >
                    Inscription
                  </Link>
                </>
              )}

              {/* Hamburger */}
              <button
                className="md:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={() => setMobileOpen((v) => !v)}
                aria-expanded={mobileOpen}
                aria-controls={mobileNavId}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mobileOpen ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="open"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>{/* /relative h-16 */}
        </div>{/* /max-w */}
      </header>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer — full-screen slide-down */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="drawer"
            id={mobileNavId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation mobile"
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-16 left-0 right-0 bottom-0 z-40 md:hidden bg-[oklch(0.05_0.005_240)]/97 backdrop-blur-2xl backdrop-saturate-150 border-t border-white/8 overflow-y-auto"
          >
            {/* Brand gradient top edge */}
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, var(--rbs-red) 25%, var(--rbs-gold) 50%, var(--rbs-green) 75%, transparent 100%)',
              }}
            />

            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              <motion.div
                variants={itemVariants}
                transition={{ delay: 0, duration: 0.2, ease: EASE_OUT }}
              >
                <Link
                  href="/"
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150 min-h-[44px]',
                    pathname === '/'
                      ? 'bg-[var(--rbs-red)]/15 text-white border border-[var(--rbs-red)]/30'
                      : 'text-white/65 hover:text-white hover:bg-white/6'
                  )}
                >
                  Home
                </Link>
              </motion.div>

              {links.map(({ href, label, icon: Icon }, i) => {
                const active = pathname.startsWith(href);
                return (
                  <motion.div
                    key={href}
                    variants={itemVariants}
                    transition={{ delay: (i + 1) * 0.04, duration: 0.2, ease: EASE_OUT }}
                  >
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150 min-h-[44px]',
                        active
                          ? 'bg-[var(--rbs-red)]/15 text-white border border-[var(--rbs-red)]/30'
                          : 'text-white/65 hover:text-white hover:bg-white/6'
                      )}
                    >
                      <Icon
                        className={cn('w-5 h-5', active ? 'text-[var(--rbs-red)]' : 'text-white/40')}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="border-t border-white/8 mt-2 pt-2">
                {session ? (
                  <>
                    <motion.div
                      variants={itemVariants}
                      transition={{ delay: (links.length + 1) * 0.04, duration: 0.2, ease: EASE_OUT }}
                    >
                      {isArtist && (
                        <Link
                          href="/espace-artiste"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all min-h-[44px]"
                        >
                          <LogIn className="w-5 h-5 text-white/40" aria-hidden="true" />
                          Mon espace
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all min-h-[44px]"
                      >
                        <LogIn className="w-5 h-5 text-white/40" aria-hidden="true" />
                        Mon profil
                      </Link>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      transition={{ delay: (links.length + 2) * 0.04, duration: 0.2, ease: EASE_OUT }}
                    >
                      <button
                        onClick={() => signOut({ callbackUrl: '/' }).then(() => setMobileOpen(false))}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/60 hover:text-white hover:bg-white/6 transition-all min-h-[44px]"
                      >
                        <LogOut className="w-5 h-5 text-white/40" aria-hidden="true" />
                        Déconnexion
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      variants={itemVariants}
                      transition={{ delay: (links.length + 1) * 0.04, duration: 0.2, ease: EASE_OUT }}
                    >
                      <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all min-h-[44px]"
                      >
                        <LogIn className="w-5 h-5 text-white/40" aria-hidden="true" />
                        Connexion
                      </Link>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      transition={{ delay: (links.length + 2) * 0.04, duration: 0.2, ease: EASE_OUT }}
                    >
                      <Link
                        href="/register"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-[var(--rbs-red)] hover:text-white hover:bg-[var(--rbs-red)]/20 transition-all min-h-[44px]"
                      >
                        <UserPlus className="w-5 h-5 text-[var(--rbs-red)]/60" aria-hidden="true" />
                        Créer un compte
                      </Link>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
