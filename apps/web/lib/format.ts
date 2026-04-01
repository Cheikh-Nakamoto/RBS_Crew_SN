// ─── Shared formatting utilities ─────────────────────────────────────────────

/**
 * Format a number as XOF (West African CFA franc) currency
 * used in Senegal / France locale
 */
export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string to a readable French format
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', options);
}

/**
 * Truncate a string to a max length, adding ellipsis
 */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}
