import { notFound } from 'next/navigation';
import { fetchAdminFestivalEdition } from '@/lib/admin/queries';
import { FestivalEditionForm } from '@/components/admin/forms/festival-edition-form';
import type { FestivalEditionFormProps } from '@/components/admin/forms/festival-edition-form';
import { updateEditions } from '../actions';
export const metadata = { title: 'Modifier' };
export default async function EditEditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await fetchAdminFestivalEdition(id);
  } catch {
    notFound();
  }
  return <FestivalEditionForm mode="edit" backHref="/admin/editions" initialData={data as unknown as FestivalEditionFormProps['initialData']} onUpdate={updateEditions} />;
}
