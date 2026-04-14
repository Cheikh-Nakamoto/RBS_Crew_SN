import { fetchAdminArtist } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updateArtistes } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditArtistesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminArtist(id);
  return <TranslatableEntityForm mode="edit" backHref="/admin/artistes" entityLabel="artistes" showImage={true} showGallery={true} initialData={data as unknown as Parameters<typeof TranslatableEntityForm>[0]["initialData"]} onCreate={() => Promise.resolve()} onUpdate={updateArtistes} />;
}
