import { notFound } from 'next/navigation';
import { fetchAdminArtist } from '@/lib/admin/queries';
import { ArtistForm } from '@/components/admin/forms/artist-form';
import { updateArtistes } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditArtistesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await fetchAdminArtist(id);
  } catch {
    notFound();
  }
  return <ArtistForm mode="edit" backHref="/admin/artistes" initialData={data} onUpdate={updateArtistes} />;
}
