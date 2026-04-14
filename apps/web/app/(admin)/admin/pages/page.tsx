import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminPages as fetchPages } from '@/lib/admin/queries';
import { PagesTable } from './_components/pages-table';
export const metadata = { title: 'Pages' };
export default async function PagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await fetchPages({ page: Number(params.page ?? 1), limit: 20 });
  return (<><AdminPageHeader title="Pages" eyebrow="Contenu" description={`${data.meta.total} élément(s)`} action={{ href: '/admin/pages/nouveau', label: 'Nouveau / Nouvelle' }} /><Suspense><PagesTable data={data.data} pagination={data.meta} /></Suspense></>);
}
