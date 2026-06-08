import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminArtists as fetchArtistes } from '@/lib/admin/queries';
import { ArtistesTable } from './_components/artistes-table';
export const metadata = { title: 'Artistes' };
export default async function ArtistesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await fetchArtistes({ page: Number(params.page ?? 1), limit: 20 });
  return (<><AdminPageHeader title="Artistes" eyebrow="Contenu" description={`${data.meta.total} élément(s)`} action={{ href: '/admin/artistes/nouveau', label: 'Nouveau / Nouvelle' }} /><ArtistesTable data={data.data} pagination={data.meta} /></>);
}
