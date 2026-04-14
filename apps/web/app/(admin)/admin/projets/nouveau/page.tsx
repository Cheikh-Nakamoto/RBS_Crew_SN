import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createProjets } from '../actions';
export const metadata = { title: 'Nouveau projet' };
export default function NouveauProjetsPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/projets" entityLabel="projet" showImage={true} showGallery={true} showMeta={true} onCreate={createProjets} />;
}
