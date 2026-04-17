import { ProjectForm } from '@/components/admin/forms/project-form';
import { createProjets } from '../actions';
export const metadata = { title: 'Nouveau projet' };
export default function NouveauProjetsPage() {
  return <ProjectForm mode="create" backHref="/admin/projets" onCreate={createProjets} />;
}
