'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ActionResult } from '@/lib/admin/errors';

interface AdminStatusSelectProps<T extends string> {
  id: string;
  currentValue: T;
  label: string;
  description?: string;
  options: Record<T, string>;
  updateAction: (id: string, value: T) => Promise<ActionResult>;
}

export function AdminStatusSelect<T extends string>({
  id,
  currentValue,
  label,
  description,
  options,
  updateAction,
}: AdminStatusSelectProps<T>) {
  const [value, setValue] = useState<T>(currentValue);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        const result = await updateAction(id, value);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('Mis à jour');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-white/50 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Select value={value} onValueChange={(v) => v && setValue(v as T)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[var(--rbs-red)]/30 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white">
            {(Object.keys(options) as T[]).map((key) => (
              <SelectItem key={key} value={key} className="focus:bg-white/10">
                {options[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleUpdate}
          disabled={isPending || value === currentValue}
          className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white"
        >
          {isPending ? 'Mise à jour...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
