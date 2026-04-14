import { fetchAdminService } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updateServices } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminService(id);
  return <TranslatableEntityForm mode="edit" backHref="/admin/services" entityLabel="services" showImage={true} initialData={data as unknown as Parameters<typeof TranslatableEntityForm>[0]["initialData"]} onCreate={() => Promise.resolve()} onUpdate={updateServices} />;
}
