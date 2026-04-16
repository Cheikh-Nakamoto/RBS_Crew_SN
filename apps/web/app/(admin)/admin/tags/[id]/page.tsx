import { fetchAdminTag } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import type { TranslatableEntityFormProps } from '@/components/admin/forms/translatable-entity-form';
import { updateTag } from '../actions';
export const metadata = { title: 'Modifier le tag' };
export default async function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tag = await fetchAdminTag(id);
  return <TranslatableEntityForm mode="edit" backHref="/admin/tags" entityLabel="tag" showContent={false} showMeta={false} initialData={tag as unknown as TranslatableEntityFormProps['initialData']} onUpdate={updateTag} />;
}
