import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminProjects as fetchProjets } from '@/lib/admin/queries';
import { ProjetsTable } from './_components/projets-table';
export const metadata = { title: 'Projets' };
export default async function ProjetsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await fetchProjets({ page: Number(params.page ?? 1), limit: 20 });
  return (<><AdminPageHeader title="Projets" eyebrow="Contenu" description={`${data.meta.total} élément(s)`} action={{ href: '/admin/projets/nouveau', label: 'Nouveau / Nouvelle' }} /><Suspense><ProjetsTable data={data.data} pagination={data.meta} /></Suspense></>);
}
