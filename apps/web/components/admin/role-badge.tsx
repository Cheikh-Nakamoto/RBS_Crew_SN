import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/admin';
import { ROLE_META_BADGE } from '@/lib/admin/status-maps';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const meta = ROLE_META_BADGE[role] ?? ROLE_META_BADGE.CUSTOMER;
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
