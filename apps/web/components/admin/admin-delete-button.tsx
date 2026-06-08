'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import type { ActionResult } from '@/lib/admin/errors';

interface AdminDeleteButtonProps {
  id: string;
  title: string;
  description: string;
  successMessage: string;
  redirectPath: string;
  deleteAction: (id: string) => Promise<ActionResult<void>>;
}

export function AdminDeleteButton({
  id,
  title,
  description,
  successMessage,
  redirectPath,
  deleteAction,
}: AdminDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteAction(id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
        router.push(redirectPath);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
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
        title={title}
        description={description}
      />
    </>
  );
}
