'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ShippingMethod {
  id: string;
  code: string;
  isPickup: boolean;
  enabled: boolean;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  names: Record<string, string>;
}

interface ShippingZone {
  id: string;
  code: string;
  names: Record<string, string>;
}

interface ShippingRate {
  id: string;
  zoneId: string;
  methodId: string;
  flatFee: number;
  freeAbove?: number;
  currency: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ShippingMethodsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingMethod | null>(null);
  const [code, setCode] = useState('');
  const [nameFR, setNameFR] = useState('');
  const [nameEN, setNameEN] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [daysMin, setDaysMin] = useState('');
  const [daysMax, setDaysMax] = useState('');
  const [isPending, startTransition] = useTransition();

  // Rate form
  const [rateZone, setRateZone] = useState('');
  const [rateMethod, setRateMethod] = useState('');
  const [flatFee, setFlatFee] = useState('');
  const [freeAbove, setFreeAbove] = useState('');
  const [rateCurrency, setRateCurrency] = useState('XOF');
  const [rateIsPending, startRateTransition] = useTransition();

  async function fetchAll() {
    setLoading(true);
    try {
      const [mRes, zRes] = await Promise.all([
        fetch(`${API_URL}/admin/shipping/methods`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/shipping/zones`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (mRes.ok) setMethods(await mRes.json());
      if (zRes.ok) setZones(await zRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) fetchAll(); }, [token]); // eslint-disable-line

  function openSheet(method?: ShippingMethod) {
    setEditing(method ?? null);
    setCode(method?.code ?? '');
    setNameFR(method?.names?.fr ?? '');
    setNameEN(method?.names?.en ?? '');
    setIsPickup(method?.isPickup ?? false);
    setEnabled(method?.enabled ?? true);
    setDaysMin(method?.estimatedDaysMin?.toString() ?? '');
    setDaysMax(method?.estimatedDaysMax?.toString() ?? '');
    setOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const url = editing
        ? `${API_URL}/admin/shipping/methods/${editing.id}`
        : `${API_URL}/admin/shipping/methods`;
      const method = editing ? 'PUT' : 'POST';
      const body = {
        code, isPickup, enabled, names: { fr: nameFR, en: nameEN },
        estimatedDaysMin: daysMin ? parseInt(daysMin) : null,
        estimatedDaysMax: daysMax ? parseInt(daysMax) : null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.message ?? 'Erreur');
        return;
      }
      toast.success(editing ? 'Méthode mise à jour' : 'Méthode créée');
      setOpen(false);
      fetchAll();
    });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`${API_URL}/admin/shipping/methods/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { toast.success('Méthode supprimée'); fetchAll(); }
    else toast.error('Erreur lors de la suppression');
  }

  function handleUpsertRate() {
    startRateTransition(async () => {
      const res = await fetch(`${API_URL}/admin/shipping/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          zoneId: rateZone, methodId: rateMethod,
          flatFee: parseFloat(flatFee),
          freeAbove: freeAbove ? parseFloat(freeAbove) : undefined,
          currency: rateCurrency,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.message ?? 'Erreur');
        return;
      }
      toast.success('Tarif enregistré');
      setRateOpen(false);
    });
  }

  return (
    <div className="space-y-6">
      {/* Methods table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">{methods.length} méthode(s)</p>
          <div className="flex gap-2">
            <Sheet open={rateOpen} onOpenChange={setRateOpen}>
              <SheetTrigger render={<Button variant="outline" className="gap-2 border-white/20 text-white/70 hover:text-white hover:bg-white/5" />}>
                <Plus className="h-4 w-4" />
                Tarif zone×méthode
              </SheetTrigger>
              <SheetContent className="bg-[#0a0a0a] border-white/10 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Tarif livraison</SheetTitle>
                  <SheetDescription className="text-white/50">
                    Définissez le tarif pour une combinaison zone × méthode.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-6">
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Zone</Label>
                    <select value={rateZone} onChange={e => setRateZone(e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm">
                      <option value="">Sélectionner une zone</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.names?.fr ?? z.code}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Méthode</Label>
                    <select value={rateMethod} onChange={e => setRateMethod(e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm">
                      <option value="">Sélectionner une méthode</option>
                      {methods.map(m => <option key={m.id} value={m.id}>{m.names?.fr ?? m.code}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-white/70 text-xs uppercase tracking-widest">Tarif fixe</Label>
                      <Input type="number" value={flatFee} onChange={e => setFlatFee(e.target.value)} placeholder="2500" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/70 text-xs uppercase tracking-widest">Gratuit si ≥</Label>
                      <Input type="number" value={freeAbove} onChange={e => setFreeAbove(e.target.value)} placeholder="50000" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Devise</Label>
                    <Input value={rateCurrency} onChange={e => setRateCurrency(e.target.value)} placeholder="XOF" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleUpsertRate} disabled={!rateZone || !rateMethod || !flatFee || rateIsPending} className="w-full bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90">
                    {rateIsPending ? 'Enregistrement…' : 'Enregistrer le tarif'}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button onClick={() => openSheet()} className="gap-2 bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90" />}>
                <Plus className="h-4 w-4" />
                Nouvelle méthode
              </SheetTrigger>
              <SheetContent className="bg-[#0a0a0a] border-white/10 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">{editing ? 'Modifier' : 'Nouvelle méthode'}</SheetTitle>
                  <SheetDescription className="text-white/50">Méthode de livraison ou retrait.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-6">
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Code</Label>
                    <Input value={code} onChange={e => setCode(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Nom (FR)</Label>
                    <Input value={nameFR} onChange={e => setNameFR(e.target.value)} placeholder="Livraison express Dakar" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs uppercase tracking-widest">Nom (EN)</Label>
                    <Input value={nameEN} onChange={e => setNameEN(e.target.value)} placeholder="Dakar express delivery" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-white/70 text-xs uppercase tracking-widest">Délai min (jours)</Label>
                      <Input type="number" value={daysMin} onChange={e => setDaysMin(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/70 text-xs uppercase tracking-widest">Délai max</Label>
                      <Input type="number" value={daysMax} onChange={e => setDaysMax(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isPickup} onChange={e => setIsPickup(e.target.checked)} className="accent-[var(--rbs-red)]" />
                      <span className="text-sm text-white/70">Retrait en place</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-[var(--rbs-red)]" />
                      <span className="text-sm text-white/70">Activée</span>
                    </label>
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleSave} disabled={!code || isPending} className="w-full bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90">
                    {isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {loading ? (
          <p className="text-white/40 text-sm">Chargement…</p>
        ) : methods.length === 0 ? (
          <div className="rounded-lg border border-white/10 p-8 text-center text-white/40">
            Aucune méthode de livraison. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Code</TableHead>
                  <TableHead className="text-white/50">Nom FR</TableHead>
                  <TableHead className="text-white/50">Délai</TableHead>
                  <TableHead className="text-white/50">État</TableHead>
                  <TableHead className="text-white/50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map(m => (
                  <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-white/70">{m.code}</TableCell>
                    <TableCell className="text-white">{m.names?.fr ?? '—'}</TableCell>
                    <TableCell className="text-white/50 text-sm">
                      {m.estimatedDaysMin && m.estimatedDaysMax ? `${m.estimatedDaysMin}–${m.estimatedDaysMax}j` : '—'}
                    </TableCell>
                    <TableCell>
                      {m.enabled ? (
                        <Badge variant="outline" className="border-green-500/40 text-green-400 text-xs">Actif</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs">Désactivé</Badge>
                      )}
                      {m.isPickup && (
                        <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-xs ml-1">Retrait</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openSheet(m)} className="h-8 w-8 text-white/50 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)} className="h-8 w-8 text-red-400/60 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
