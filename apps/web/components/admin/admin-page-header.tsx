import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminPageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: {
    href?: string;
    label: string;
    onClick?: () => void;
  };
}

export function AdminPageHeader({ title, eyebrow, description, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-white/50">{description}</p>
        )}
      </div>
      {action && (
        action.href ? (
          <Button
            asChild
            className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white gap-2 flex-shrink-0"
          >
            <Link href={action.href}>
              <Plus className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button
            onClick={action.onClick}
            className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white gap-2 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
