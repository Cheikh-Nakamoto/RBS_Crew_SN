'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateOrderStatus } from '../../actions';
import type { OrderStatus } from '@/types/admin';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours de traitement',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  FAILED: 'Échouée',
};

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderStatusForm({ orderId, currentStatus }: OrderStatusFormProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        const result = await updateOrderStatus(orderId, { status });
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Statut mis à jour');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
      <p className="text-sm font-semibold text-white">Modifier le statut</p>
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => v && setStatus(v as OrderStatus)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[var(--rbs-red)]/30 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white">
            {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="focus:bg-white/10">
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleUpdate}
          disabled={isPending || status === currentStatus}
          className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white"
        >
          {isPending ? 'Mise à jour...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
