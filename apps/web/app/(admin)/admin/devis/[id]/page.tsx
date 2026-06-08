import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAdminQuote } from '@/lib/admin/queries';
import { AdminStatusSelect } from '@/components/admin/admin-status-select';
import { AdminDeleteButton } from '@/components/admin/admin-delete-button';
import { updateQuoteStatus, deleteQuote } from '../actions';

const QUOTE_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  IN_REVIEW: "En cours d'examen",
  ANSWERED: 'Répondu',
};

export const metadata = { title: 'Détail devis' };

import { QUOTE_STATUS_META } from '@/lib/admin/status-maps';

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let quote;
  try {
    quote = await fetchAdminQuote(id);
  } catch {
    notFound();
  }

  const statusMeta = QUOTE_STATUS_META[quote.status];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
            <Link href="/admin/devis"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80">Devis</p>
            <h1 className="text-2xl font-black text-white">{quote.name}</h1>
          </div>
        </div>
        <AdminDeleteButton
          id={quote.id}
          title={`Supprimer le devis de ${quote.name} ?`}
          description="Ce devis sera définitivement supprimé. Cette action est irréversible."
          successMessage="Devis supprimé"
          redirectPath="/admin/devis"
          deleteAction={deleteQuote}
        />
      </div>

      {/* Statut */}
      <Badge variant="outline" className={statusMeta?.className}>{statusMeta?.label}</Badge>

      {/* Informations de contact */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Contact</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/40 text-xs mb-1">Nom complet</p>
            <p className="text-white">{quote.name}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Email</p>
            <p className="text-white">{quote.email}</p>
          </div>
          {quote.phone && (
            <div>
              <p className="text-white/40 text-xs mb-1">Téléphone</p>
              <p className="text-white">{quote.phone}</p>
            </div>
          )}
          {quote.company && (
            <div>
              <p className="text-white/40 text-xs mb-1">Entreprise</p>
              <p className="text-white">{quote.company}</p>
            </div>
          )}
          <div>
            <p className="text-white/40 text-xs mb-1">Date de réception</p>
            <p className="text-white">
              {new Date(quote.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </p>
          </div>
          {quote.budget && (
            <div>
              <p className="text-white/40 text-xs mb-1">Budget</p>
              <p className="text-white">{quote.budget.toLocaleString('fr-SN')} FCFA</p>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Message</p>
        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{quote.message}</p>
      </div>

      {/* Changer le statut */}
      <AdminStatusSelect
        id={quote.id}
        currentValue={quote.status as 'NEW' | 'IN_REVIEW' | 'ANSWERED'}
        label="Modifier le statut"
        options={QUOTE_STATUS_LABELS}
        updateAction={(id, value) => updateQuoteStatus(id, value)}
      />
    </div>
  );
}
