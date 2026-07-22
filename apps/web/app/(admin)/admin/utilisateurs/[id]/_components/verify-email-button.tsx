'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyUserEmail } from '../../actions';

/**
 * Débloque un client dont l'e-mail de vérification n'arrive pas.
 * Sans adresse vérifiée, il ne peut pas passer commande.
 */
export function VerifyEmailButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await verifyUserEmail(userId);
      if (res.success) {
        toast.success('Adresse marquée comme vérifiée — le client peut commander.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Opération impossible');
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending} className="gap-2">
      <MailCheck className="w-4 h-4" />
      Marquer l&apos;e-mail comme vérifié
    </Button>
  );
}
