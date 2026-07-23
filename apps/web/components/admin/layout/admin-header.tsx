'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Menu, LogOut, User, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ROLE_META_HEADER } from '@/lib/admin/status-maps';

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Tableau de bord',
  produits: 'Produits',
  categories: 'Catégories',
  tags: 'Tags',
  commandes: 'Commandes',
  devis: 'Devis',
  utilisateurs: 'Utilisateurs',
  pages: 'Pages',
  services: 'Services',
  projets: 'Projets',
  artistes: 'Artistes',
  editions: 'Éditions',
  presse: 'Presse',
  nouveau: 'Nouveau',
};

function getLabel(segment: string) {
  return SEGMENT_LABELS[segment] ?? 'Modifier';
}

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: getLabel(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? '';
  const initials = [user?.name?.[0], user?.email?.[0]].filter(Boolean).join('').toUpperCase().slice(0, 2) || 'A';

  const roleMeta = ROLE_META_HEADER[role] ?? ROLE_META_HEADER['CUSTOMER'];

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/20 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {/* Breadcrumbs */}
        <nav aria-label="Fil d'Ariane">
          <ol className="flex items-center gap-1.5">
            {breadcrumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {!crumb.isLast ? (
                  <>
                    <a
                      href={crumb.href}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      {crumb.label}
                    </a>
                    <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                  </>
                ) : (
                  <span className="text-sm font-medium text-white">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-3 py-2 h-auto hover:bg-white/5 text-white inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[var(--rbs-red)]/30 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-white leading-tight">
                {user?.name ?? user?.email}
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  roleMeta.color
                )}
              >
                {roleMeta.label}
              </span>
            </div>
          </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-white/10 bg-black/90 backdrop-blur-xl text-white"
        >
          {/* Base UI exige qu'un GroupLabel vive dans un Group — sans lui, le
              menu jette « MenuGroupContext is missing » (erreur #31) en prod. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-white/50 text-xs">Mon compte</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem render={<a href="/profile" />} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white">
            <User className="h-4 w-4" />
            Profil
          </DropdownMenuItem>
          {/* Doublon du lien de la sidebar : sur mobile celle-ci est repliée
              dans un tiroir, ce menu reste la seule sortie accessible en un clic. */}
          <DropdownMenuItem render={<Link href="/" />} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white">
            <Home className="h-4 w-4" />
            Retour au site
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
