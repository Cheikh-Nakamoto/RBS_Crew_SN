'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteUser } from '../../actions';

interface UserDeleteButtonProps {
  userId: string;
  userName: string;
}

export function UserDeleteButton({ userId, userName }: UserDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteUser(userId);
        toast.success('Utilisateur supprimé');
        router.push('/admin/utilisateurs');
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
        title={`Supprimer ${userName} ?`}
        description="Cet utilisateur et toutes ses données seront définitivement supprimés. Cette action est irréversible."
      />
    </>
  );
}
