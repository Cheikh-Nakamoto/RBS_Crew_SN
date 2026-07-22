'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw } from 'lucide-react';
import { API_BASE } from '@/lib/api-base';

interface Props {
  orderId: string;
  orderTotal: number;
  currency: string;
  userRole: string;
  accessToken: string;
}

const API_URL = API_BASE;

export function RefundPanel({ orderId, orderTotal, currency, userRole, accessToken }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [manualRefund, setManualRefund] = useState<{ id: string } | null>(null);
  const [manualRef, setManualRef] = useState('');
  const [markingManual, startMarkManual] = useTransition();

  // RBAC: only ADMIN can refund
  if (userRole !== 'ADMIN') return null;

  function handleRefund() {
    const idempotencyKey = `refund-${orderId}-${Date.now()}`;
    startTransition(async () => {
      try {
        const res = await fetch(`${API_URL}/admin/orders/${orderId}/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ amount: parseFloat(amount), reason, idempotencyKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message ?? 'Erreur lors du remboursement');
          return;
        }
        if (data.isManualRequired) {
          setManualRefund({ id: data.id });
          toast.info('Remboursement Wave — traitement manuel requis dans le dashboard Wave');
        } else {
          toast.success('Remboursement initié avec succès');
          setOpen(false);
          router.refresh();
        }
      } catch {
        toast.error('Erreur réseau');
      }
    });
  }

  function handleMarkManual() {
    if (!manualRefund) return;
    startMarkManual(async () => {
      try {
        const res = await fetch(`${API_URL}/admin/refunds/${manualRefund.id}/mark-completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ manualReference: manualRef }),
        });
        if (!res.ok) {
          const d = await res.json();
          toast.error(d.message ?? 'Erreur');
          return;
        }
        toast.success('Remboursement manuel marqué comme complété');
        setOpen(false);
        setManualRefund(null);
        router.refresh();
      } catch {
        toast.error('Erreur réseau');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2 border-orange-500/40 text-orange-400 hover:bg-orange-500/10" />}>
        <RefreshCcw className="h-4 w-4" />
        Rembourser
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Rembourser la commande</DialogTitle>
          <DialogDescription className="text-white/50">
            Total commande : {orderTotal.toLocaleString('fr-SN')} {currency}
          </DialogDescription>
        </DialogHeader>

        {manualRefund ? (
          // Wave manual completion flow
          <div className="space-y-4">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-400 gap-1">
              Remboursement Wave — traitement manuel
            </Badge>
            <p className="text-sm text-white/60">
              L&apos;API Wave ne supporte pas les remboursements programmatiques.
              Effectuez le remboursement dans votre dashboard Wave puis saisissez la référence de transaction.
            </p>
            <div className="space-y-1">
              <Label className="text-white/70 text-xs uppercase tracking-widest">Référence Wave (recommandé)</Label>
              <Input
                value={manualRef}
                onChange={e => setManualRef(e.target.value)}
                placeholder="TXN-WAVE-XXXXXXXX"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setManualRefund(null)} className="text-white/60">
                Retour
              </Button>
              <Button
                onClick={handleMarkManual}
                disabled={markingManual}
                className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90"
              >
                {markingManual ? 'Enregistrement…' : 'Marquer comme remboursé'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Standard refund form
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-white/70 text-xs uppercase tracking-widest">Montant ({currency})</Label>
              <Input
                type="number"
                min="1"
                max={orderTotal}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Max ${orderTotal}`}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70 text-xs uppercase tracking-widest">Motif</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Retour client, article défectueux…"
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <DialogFooter>
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button disabled={!amount || !reason || isPending} className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 w-full" />
                }>
                  Confirmer le remboursement
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Confirmer ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      Remboursement de {parseFloat(amount || '0').toLocaleString('fr-SN')} {currency}.<br />
                      Cette action est irréversible une fois envoyée au provider de paiement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-white/70">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRefund}
                      className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90"
                    >
                      {isPending ? 'Traitement…' : 'Confirmer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
