import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/admin';

const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'bg-[var(--rbs-red)]/20 text-[var(--rbs-red)] border-[var(--rbs-red)]/30' },
  EDITOR: { label: 'Éditeur', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  CUSTOMER: { label: 'Client', className: 'bg-white/10 text-white/60 border-white/20' },
};

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const meta = ROLE_META[role] ?? ROLE_META.CUSTOMER;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
