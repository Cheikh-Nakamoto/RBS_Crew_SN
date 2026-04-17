import { fetchAdminProject } from '@/lib/admin/queries';
import { ProjectForm } from '@/components/admin/forms/project-form';
import { updateProjets } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditProjetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchAdminProject(id);
  return <ProjectForm mode="edit" backHref="/admin/projets" initialData={data} onUpdate={updateProjets} />;
}
