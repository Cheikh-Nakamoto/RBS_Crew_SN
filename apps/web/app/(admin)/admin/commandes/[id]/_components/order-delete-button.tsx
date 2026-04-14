'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteOrder } from '../../actions';

interface OrderDeleteButtonProps {
  orderId: string;
  orderNumber: string;
}

export function OrderDeleteButton({ orderId, orderNumber }: OrderDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteOrder(orderId);
        toast.success('Commande supprimée');
        router.push('/admin/commandes');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Supprimer
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleDelete}
        isDeleting={isPending}
        title={`Supprimer la commande ${orderNumber} ?`}
        description="Cette commande et tous ses articles seront définitivement supprimés. Cette action est irréversible."
      />
    </>
  );
}
