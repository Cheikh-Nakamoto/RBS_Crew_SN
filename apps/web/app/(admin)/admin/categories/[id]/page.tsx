import { notFound } from 'next/navigation';
import { fetchAdminCategory } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updateCategory } from '../actions';

export const metadata = { title: 'Modifier la catégorie' };

export default async function EditCategoriePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let category;
  try {
    category = await fetchAdminCategory(id);
  } catch {
    notFound();
  }

  return (
    <TranslatableEntityForm
      mode="edit"
      backHref="/admin/categories"
      entityLabel="catégorie"
      showImage={true}
      showContent={false}
      showMeta={false}
      initialData={category as unknown as Parameters<typeof TranslatableEntityForm>[0]['initialData']}
      onUpdate={updateCategory}
    />
  );
}
