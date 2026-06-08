import { notFound } from 'next/navigation';
import { fetchAdminPage } from '@/lib/admin/queries';
import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { updatePages } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditPagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await fetchAdminPage(id);
  } catch {
    notFound();
  }
  return <TranslatableEntityForm mode="edit" backHref="/admin/pages" entityLabel="pages" showImage={false} initialData={data as unknown as Parameters<typeof TranslatableEntityForm>[0]["initialData"]} onUpdate={updatePages} />;
}
