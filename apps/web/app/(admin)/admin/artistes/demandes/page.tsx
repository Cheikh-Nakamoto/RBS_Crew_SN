import { fetchArtistClaims, fetchAdminArtists } from '@/lib/admin/queries';
import { ClaimsList } from './_components/claims-list';

export const metadata = { title: 'Demandes artiste' };

export default async function ArtistClaimsPage() {
  // Les fiches servent au rattachement : on les charge toutes pour peupler le
  // sélecteur, en signalant celles déjà prises par un autre compte.
  const [claims, artists] = await Promise.all([
    fetchArtistClaims('PENDING'),
    fetchAdminArtists({ limit: 200 }),
  ]);

  const options = artists.data.map((a) => ({
    id: a.id,
    label: a.translations?.find((t) => t.locale === 'fr')?.title ?? a.slug,
    taken: Boolean(a.accountEmail),
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
