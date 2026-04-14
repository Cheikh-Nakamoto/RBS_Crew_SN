import { fetchAdminProject } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updateProjets } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditProjetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminProject(id);
  return <TranslatableEntityForm mode="edit" backHref="/admin/projets" entityLabel="projets" showImage={true} showGallery={true} initialData={data as unknown as Parameters<typeof TranslatableEntityForm>[0]["initialData"]} onCreate={() => Promise.resolve()} onUpdate={updateProjets} />;
}
