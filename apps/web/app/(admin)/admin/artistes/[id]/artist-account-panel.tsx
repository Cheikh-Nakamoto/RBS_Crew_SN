'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { inviteArtiste } from '../actions';

interface Props {
  artistId: string;
  accountEmail?: string | null;
  accountStatus?: string | null;
}

const STATUS_LABEL: Record<string, { label: string; variant: 'secondary' | 'outline' | 'default' }> = {
  none: { label: 'Aucun compte', variant: 'outline' },
  invited: { label: 'Invitation envoyée', variant: 'secondary' },
  active: { label: 'Compte actif', variant: 'default' },
};

/**
 * Rattache un compte à la fiche pour que l'artiste puisse la mettre à jour
 * lui-même (biographie, photos, réseaux sociaux, portfolio). La publication de
 * la fiche et son adresse restent gérées ici, côté administration.
 */
export function ArtistAccountPanel({ artistId, accountEmail, accountStatus }: Props) {
  const [email, setEmail] = useState(accountEmail ?? '');
  const [pending, startTransition] = useTransition();

  const status = STATUS_LABEL[accountStatus ?? 'none'] ?? STATUS_LABEL.none;
  const alreadyActive = accountStatus === 'active';

  function handleInvite() {
    if (!email.trim()) {
      toast.error('Renseignez une adresse e-mail.');
      return;
    }
    startTransition(async () => {
      const result = await inviteArtiste(artistId, email.trim());
      if (!result.success) {
        toast.error(result.error ?? "Impossible d'inviter cet artiste");
        return;
      }
      // Le compte peut être créé sans que l'e-mail parte (SMTP indisponible) :
      // le dire explicitement plutôt que d'afficher un succès trompeur.
      const sent = (result.data as { emailSent?: boolean } | undefined)?.emailSent;
      if (sent === false) {
        toast.warning(
          `Compte créé pour ${email.trim()}, mais l'e-mail n'a pas pu être envoyé. Réessayez l'envoi.`,
        );
      } else {
        toast.success('Invitation envoyée à ' + email.trim());
      }
    });
  }

  return (
    <section className="rounded-xl border p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4" /> Compte artiste
          </h2>
          <p className="text-sm text-muted-foreground">
            Permet à l&apos;artiste de mettre à jour sa fiche depuis son propre espace.
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="artist-account-email">Adresse e-mail</Label>
          <Input
            id="artist-account-email"
            type="email"
            placeholder="artiste@exemple.sn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="button" onClick={handleInvite} disabled={pending} className="gap-2">
          <Send className="w-4 h-4" />
          {accountStatus === 'invited' ? "Renvoyer l'invitation" : 'Inviter'}
        </Button>
      </div>

      {alreadyActive && (
        <p className="text-xs text-muted-foreground">
          Le compte est déjà actif. Envoyer une nouvelle invitation permet à l&apos;artiste de
          redéfinir son mot de passe.
        </p>
      )}
    </section>
  );
}
