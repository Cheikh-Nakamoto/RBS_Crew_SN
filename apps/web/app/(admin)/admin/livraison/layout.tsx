import Link from 'next/link';
import { MapPin, Package } from 'lucide-react';

export const metadata = { title: 'Livraison — RBS Admin' };

export default function LivraisonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80">Logistique</p>
        <h1 className="text-2xl font-black text-white">Livraison</h1>
      </div>
      <nav className="flex gap-1 border-b border-white/10 pb-0">
        <Link
          href="/admin/livraison/zones"
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white border-b-2 border-transparent hover:border-[var(--rbs-red)] transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Zones
        </Link>
        <Link
          href="/admin/livraison/methodes"
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white border-b-2 border-transparent hover:border-[var(--rbs-red)] transition-colors"
        >
          <Package className="h-4 w-4" />
          Méthodes &amp; Tarifs
        </Link>
      </nav>
      {children}
    </div>
  );
}
