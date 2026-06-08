import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminServices as fetchServices } from '@/lib/admin/queries';
import { ServicesTable } from './_components/services-table';
export const metadata = { title: 'Services' };
export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await fetchServices({ page: Number(params.page ?? 1), limit: 20 });
  return (<><AdminPageHeader title="Services" eyebrow="Contenu" description={`${data.meta.total} élément(s)`} action={{ href: '/admin/services/nouveau', label: 'Nouveau / Nouvelle' }} /><ServicesTable data={data.data} pagination={data.meta} /></>);
}
