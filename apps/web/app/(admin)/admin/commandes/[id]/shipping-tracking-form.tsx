'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';

interface Props {
  orderId: string;
  currentCarrier?: string;
  currentTrackingNumber?: string;
  accessToken: string;
}

const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

export function ShippingTrackingForm({ orderId, currentCarrier, currentTrackingNumber, accessToken }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState(currentCarrier ?? '');
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await fetch(`${API_URL}/admin/orders/${orderId}/shipping`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ carrier, trackingNumber }),
        });
        if (!res.ok) {
          const d = await res.json();
          toast.error(d.message ?? 'Erreur lors de la mise à jour');
          return;
        }
        toast.success('Informations de livraison enregistrées');
        setOpen(false);
        router.refresh();
      } catch {
        toast.error('Erreur réseau');
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10" />}>
        <Truck className="h-4 w-4" />
        Suivi livraison
      </SheetTrigger>
      <SheetContent className="bg-[#0a0a0a] border-white/10 text-white">
        <SheetHeader>
          <SheetTitle className="text-white">Informations de livraison</SheetTitle>
          <SheetDescription className="text-white/50">
            Saisissez le transporteur et le numéro de suivi pour notifier le client.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 py-6">
          <div className="space-y-1">
            <Label className="text-white/70 text-xs uppercase tracking-widest">Transporteur</Label>
            <Input
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              placeholder="DHL, Chronopost, Colissimo…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70 text-xs uppercase tracking-widest">Numéro de suivi</Label>
            <Input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="1Z9999W99999999999"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (!carrier && !trackingNumber)}
            className="w-full bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90"
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
