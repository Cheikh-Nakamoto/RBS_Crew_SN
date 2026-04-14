import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createTag } from '../actions';
export const metadata = { title: 'Nouveau tag' };
export default function NouveauTagPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/tags" entityLabel="tag" showContent={false} showMeta={false} onCreate={createTag} />;
}
