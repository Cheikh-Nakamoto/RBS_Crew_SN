'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserRole } from '../../actions';
import type { UserRole } from '@/types/admin';

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Client',
  EDITOR: 'Éditeur (accès back-office)',
  ADMIN: 'Administrateur (accès complet)',
};

interface UserRoleFormProps {
  userId: string;
  currentRole: UserRole;
}

export function UserRoleForm({ userId, currentRole }: UserRoleFormProps) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        const result = await updateUserRole(userId, { role });
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Rôle mis à jour');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Modifier le rôle</p>
        <p className="text-xs text-white/40 mt-0.5">
          Attention : donner le rôle Admin donne un accès total au back-office.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={role} onValueChange={(v) => v && setRole(v as UserRole)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[var(--rbs-red)]/30 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <SelectItem key={r} value={r} className="focus:bg-white/10">
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleUpdate}
          disabled={isPending || role === currentRole}
          className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white"
        >
          {isPending ? 'Mise à jour...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
