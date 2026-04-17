import { ArtistForm } from '@/components/admin/forms/artist-form';
import { createArtistes } from '../actions';
export const metadata = { title: 'Nouvel artiste' };
export default function NouveauArtistesPage() {
  return <ArtistForm mode="create" backHref="/admin/artistes" onCreate={createArtistes} />;
}
