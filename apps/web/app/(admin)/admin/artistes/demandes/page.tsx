import { fetchArtistClaims, fetchArtistOptions } from '@/lib/admin/queries';
import { ClaimsList } from './_components/claims-list';

export const metadata = { title: 'Demandes artiste' };

export default async function ArtistClaimsPage() {
  // Les fiches servent au rattachement : le endpoint d'options renvoie
  // directement {id, name, taken}, sans rapatrier les entités complètes.
  const [claims, artistOptions] = await Promise.all([
    fetchArtistClaims('PENDING'),
    fetchArtistOptions(),
  ]);

  const options = artistOptions.map((a) => ({
    id: a.id,
    label: a.name,
    taken: Boolean(a.taken),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Demandes artiste</h1>
        <p className="text-sm text-muted-foreground">
          Clients s&apos;étant déclarés artistes RBS. Valider une demande attribue le rôle
          Artiste et rattache le compte à la fiche choisie ; l&apos;artiste pourra alors
          mettre à jour lui-même sa biographie, ses photos et son portfolio.
        </p>
      </header>

      <ClaimsList claims={claims} artists={options} />
    </div>
  );
}
