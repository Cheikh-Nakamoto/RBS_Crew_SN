import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminFestivalEditions as fetchEditions } from '@/lib/admin/queries';
import { EditionsTable } from './_components/editions-table';
export const metadata = { title: 'Éditions festival' };
export default async function EditionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await fetchEditions({ page: Number(params.page ?? 1), limit: 20 });
  return (<><AdminPageHeader title="Éditions festival" eyebrow="Contenu" description={`${data.meta.total} élément(s)`} action={{ href: '/admin/editions/nouveau', label: 'Nouveau / Nouvelle' }} /><Suspense><EditionsTable data={data.data} pagination={data.meta} /></Suspense></>);
}
