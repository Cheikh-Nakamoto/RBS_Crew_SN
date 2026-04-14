'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  FileText,
  Globe,
  Briefcase,
  Palette,
  Newspaper,
  Users,
  Music,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types/admin';

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tableau de bord',
    items: [
      { href: '/admin', label: 'Accueil', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/produits', label: 'Produits', icon: Package },
      { href: '/admin/categories', label: 'Catégories', icon: FolderTree },
      { href: '/admin/tags', label: 'Tags', icon: Tag },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { href: '/admin/commandes', label: 'Commandes', icon: ShoppingCart },
      { href: '/admin/devis', label: 'Devis', icon: FileText },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { href: '/admin/pages', label: 'Pages', icon: Globe },
      { href: '/admin/services', label: 'Services', icon: Briefcase },
      { href: '/admin/projets', label: 'Projets', icon: Palette },
      { href: '/admin/artistes', label: 'Artistes', icon: Music },
      { href: '/admin/editions', label: 'Éditions festival', icon: Newspaper },
      { href: '/admin/presse', label: 'Presse', icon: FileText },
    ],
  },
  {
    label: 'Utilisateurs',
    items: [
      { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, adminOnly: true },
    ],
  },
];

interface AdminSidebarProps {
  role: string;
  className?: string;
}

export function AdminSidebar({ role, className }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === 'ADMIN'),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--rbs-red)] text-white">
          <span className="text-xs font-black">RBS</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">RBS Crew SN</p>
          <p className="text-xs text-white/40">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-[var(--rbs-red)]/20 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          active ? 'text-[var(--rbs-red)]' : 'text-white/40 group-hover:text-white/70'
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {active && (
                        <ChevronRight className="h-3 w-3 text-[var(--rbs-red)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
