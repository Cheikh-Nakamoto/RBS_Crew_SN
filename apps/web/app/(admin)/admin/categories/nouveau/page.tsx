import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createCategory } from '../actions';

export const metadata = { title: 'Nouvelle catégorie' };

export default function NouvelleCategorePage() {
  return (
    <TranslatableEntityForm
      mode="create"
      backHref="/admin/categories"
      entityLabel="catégorie"
      showImage={true}
      showContent={false}
      showMeta={false}
      onCreate={createCategory}
    />
  );
}
