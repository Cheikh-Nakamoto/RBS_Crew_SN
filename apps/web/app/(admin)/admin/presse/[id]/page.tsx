import { notFound } from 'next/navigation';
import { fetchAdminPressMention } from '@/lib/admin/queries';
import { PresseEditForm } from './_components/presse-edit-form';

export const metadata = { title: 'Modifier la mention presse' };

export default async function EditPressePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await fetchAdminPressMention(id);
  } catch {
    notFound();
  }
  return <PresseEditForm initialData={data} />;
}
