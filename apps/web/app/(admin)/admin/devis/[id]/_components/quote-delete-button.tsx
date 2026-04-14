'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteQuote } from '../../actions';

interface QuoteDeleteButtonProps {
  quoteId: string;
  quoteName: string;
}

export function QuoteDeleteButton({ quoteId, quoteName }: QuoteDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteQuote(quoteId);
        toast.success('Devis supprimé');
        router.push('/admin/devis');
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
        title={`Supprimer le devis de ${quoteName} ?`}
        description="Ce devis sera définitivement supprimé. Cette action est irréversible."
      />
    </>
  );
}
