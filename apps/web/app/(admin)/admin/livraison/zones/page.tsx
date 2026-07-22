'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api-base';
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

interface ShippingZone {
  id: string;
  code: string;
  isDefault: boolean;
  priority: number;
  names: Record<string, string>;
}

const API_URL = API_BASE;

export default function ShippingZonesPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingZone | null>(null);
  const [code, setCode] = useState('');
  const [nameFR, setNameFR] = useState('');
  const [nameEN, setNameEN] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [priority, setPriority] = useState(0);
  const [isPending, startTransition] = useTransition();

  async function fetchZones() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/shipping/zones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setZones(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) fetchZones(); }, [token]); // eslint-disable-line

  function openSheet(zone?: ShippingZone) {
    setEditing(zone ?? null);
    setCode(zone?.code ?? '');
    setNameFR(zone?.names?.fr ?? '');
    setNameEN(zone?.names?.en ?? '');
    setIsDefault(zone?.isDefault ?? false);
    setPriority(zone?.priority ?? 0);
    setOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const url = editing
        ? `${API_URL}/admin/shipping/zones/${editing.id}`
        : `${API_URL}/admin/shipping/zones`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, isDefault, priority, names: { fr: nameFR, en: nameEN } }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.message ?? 'Erreur');
        return;
      }
      toast.success(editing ? 'Zone mise à jour' : 'Zone créée');
      setOpen(false);
      fetchZones();
    });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`${API_URL}/admin/shipping/zones/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success('Zone supprimée');
      fetchZones();
    } else {
      toast.error('Erreur lors de la suppression');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{zones.length} zone(s) de livraison</p>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button onClick={() => openSheet()} className="gap-2 bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90" />}>
            <Plus className="h-4 w-4" />
            Nouvelle zone
          </SheetTrigger>
          <SheetContent className="bg-[#0a0a0a] border-white/10 text-white">
            <SheetHeader>
              <SheetTitle className="text-white">{editing ? 'Modifier la zone' : 'Nouvelle zone'}</SheetTitle>
              <SheetDescription className="text-white/50">
                Définissez une zone géographique pour les frais de port.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-1">
                <Label className="text-white/70 text-xs uppercase tracking-widest">Code (ex: SN_DAKAR)</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs uppercase tracking-widest">Nom (FR)</Label>
                <Input value={nameFR} onChange={e => setNameFR(e.target.value)} placeholder="Dakar et banlieue" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs uppercase tracking-widest">Nom (EN)</Label>
                <Input value={nameEN} onChange={e => setNameEN(e.target.value)} placeholder="Dakar area" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs uppercase tracking-widest">Priorité</Label>
                <Input type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="accent-[var(--rbs-red)]" />
                <span className="text-sm text-white/70">Zone par défaut</span>
              </label>
            </div>
            <SheetFooter>
              <Button onClick={handleSave} disabled={!code || isPending} className="w-full bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90">
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">Chargement…</p>
      ) : zones.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-8 text-center text-white/40">
          Aucune zone de livraison. Créez-en une pour commencer.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50">Code</TableHead>
                <TableHead className="text-white/50">Nom FR</TableHead>
                <TableHead className="text-white/50">Priorité</TableHead>
                <TableHead className="text-white/50">Statut</TableHead>
                <TableHead className="text-white/50 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map(zone => (
                <TableRow key={zone.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-mono text-xs text-white/70">{zone.code}</TableCell>
                  <TableCell className="text-white">{zone.names?.fr ?? '—'}</TableCell>
                  <TableCell className="text-white/50">{zone.priority}</TableCell>
                  <TableCell>
                    {zone.isDefault && (
                      <Badge variant="outline" className="border-green-500/40 text-green-400 text-xs">Défaut</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openSheet(zone)} className="h-8 w-8 text-white/50 hover:text-white">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(zone.id)} className="h-8 w-8 text-red-400/60 hover:text-red-400">
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
  );
}
