/**
 * Centralized status, role, and payment badge metadata maps.
 * Used across tables, detail pages, forms, and badge components.
 */

// ─── Produits ────────────────────────────────────────────
export const PRODUCT_STATUS_META: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: 'Publié', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  DRAFT: { label: 'Brouillon', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ARCHIVED: { label: 'Archivé', className: 'bg-white/10 text-white/40 border-white/20' },
};

// ─── Commandes ────────────────────────────────────────────
export const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PROCESSING: { label: 'En cours', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  COMPLETED: { label: 'Terminée', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Annulée', className: 'bg-white/10 text-white/40 border-white/20' },
  REFUNDED: { label: 'Remboursée', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  FAILED: { label: 'Échouée', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  UNPAID: { label: 'Non payé', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PAID: { label: 'Payé', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  PARTIALLY_REFUNDED: { label: 'Part. remb.', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  REFUNDED: { label: 'Remboursé', className: 'bg-white/10 text-white/40 border-white/20' },
};

// ─── Devis ────────────────────────────────────────────────
export const QUOTE_STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: 'Nouveau', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  IN_REVIEW: { label: "En cours d'examen", className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ANSWERED: { label: 'Répondu', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

// ─── Rôles (format badge compact) ─────────────────────────
export const ROLE_META_BADGE: Record<string, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'bg-[var(--rbs-red)]/20 text-[var(--rbs-red)] border-[var(--rbs-red)]/30' },
  EDITOR: { label: 'Éditeur', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  CUSTOMER: { label: 'Client', className: 'bg-white/10 text-white/60 border-white/20' },
};

// ─── Rôles (format header/select, labels longs) ───────────
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  EDITOR: 'Éditeur',
  CUSTOMER: 'Client',
};

export const ROLE_META_HEADER: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrateur', color: 'bg-[var(--rbs-red)]/20 text-[var(--rbs-red)]' },
  EDITOR: { label: 'Éditeur', color: 'bg-blue-500/20 text-blue-400' },
  CUSTOMER: { label: 'Client', color: 'bg-white/10 text-white/60' },
};
