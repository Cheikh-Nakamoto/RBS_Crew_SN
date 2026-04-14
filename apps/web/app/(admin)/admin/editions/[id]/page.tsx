import { fetchAdminFestivalEdition } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updateEditions } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditEditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminFestivalEdition(id);
  return <TranslatableEntityForm mode="edit" backHref="/admin/editions" entityLabel="editions" showImage={true} showGallery={true} initialData={data as unknown as Parameters<typeof TranslatableEntityForm>[0]["initialData"]} onUpdate={updateEditions} />;
}
