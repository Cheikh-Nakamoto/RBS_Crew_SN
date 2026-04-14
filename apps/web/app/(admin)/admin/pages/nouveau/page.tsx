import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createPages } from '../actions';
export const metadata = { title: 'Nouveau page' };
export default function NouveauPagesPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/pages" entityLabel="page" showImage={false} showMeta={true} onCreate={createPages} />;
}
