'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ArtistClaim } from '@/lib/admin/queries';
import { approveArtistClaim, rejectArtistClaim } from '../actions';

interface ArtistOption {
  id: string;
  label: string;
  taken: boolean;
}

function fullName(c: ArtistClaim) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return n || '—';
}

export function ClaimsList({
  claims,
  artists,
}: {
  claims: ArtistClaim[];
  artists: ArtistOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Fiche choisie par demande — la validation exige un rattachement explicite.
  const [selection, setSelection] = useState<Record<string, string>>({});

  function approve(userId: string) {
    const artistId = selection[userId];
    if (!artistId) {
      toast.error('Choisissez la fiche artiste à rattacher.');
      return;
    }
    startTransition(async () => {
      const res = await approveArtistClaim(userId, artistId);
      if (res.success) {
        toast.success('Demande validée — le compte est rattaché à sa fiche.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Validation impossible');
      }
    });
  }

  function reject(userId: string) {
    startTransition(async () => {
      const res = await rejectArtistClaim(userId);
      if (res.success) {
        toast.success('Demande refusée.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Refus impossible');
      }
    });
  }

  if (claims.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Clock className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {claims.map((claim) => (
        <li key={claim.userId} className="rounded-xl border p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">{fullName(claim)}</p>
              <p className="text-sm text-muted-foreground">{claim.email}</p>
              {claim.phone && <p className="text-sm text-muted-foreground">{claim.phone}</p>}
              {claim.note && (
                <p className="text-sm mt-2 rounded-lg bg-muted px-3 py-2">
                  <span className="text-muted-foreground">Précisions : </span>
                  {claim.note}
                </p>
              )}
            </div>
            {claim.requestedAt && (
              <p className="text-xs text-muted-foreground shrink-0">
                {new Date(claim.requestedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor={`artist-${claim.userId}`}
                className="text-sm font-medium"
              >
                Rattacher à la fiche artiste
              </label>
              <Select
                value={selection[claim.userId] ?? ''}
                onValueChange={(v) =>
                  v && setSelection((prev) => ({ ...prev, [claim.userId]: v }))
                }
              >
                <SelectTrigger id={`artist-${claim.userId}`}>
                  <SelectValue placeholder="Choisir une fiche…" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.taken}>
                      {a.label}
                      {a.taken ? ' — déjà rattachée' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={() => approve(claim.userId)} disabled={pending} className="gap-2">
                <Check className="w-4 h-4" /> Valider
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => reject(claim.userId)}
                disabled={pending}
                className="gap-2"
              >
                <X className="w-4 h-4" /> Refuser
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
