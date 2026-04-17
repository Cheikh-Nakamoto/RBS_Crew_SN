import { fetchAdminArtist } from '@/lib/admin/queries';
import { ArtistForm } from '@/components/admin/forms/artist-form';
import { updateArtistes } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditArtistesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminArtist(id);
  return <ArtistForm mode="edit" backHref="/admin/artistes" initialData={data} onUpdate={updateArtistes} />;
}
