import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminTags } from '@/lib/admin/queries';
import { TagsTable } from './_components/tags-table';

export const metadata = { title: 'Tags' };

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  const data = await fetchAdminTags({ page: Number(params.page ?? 1), limit: 20, search: params.search });
  return (
    <>
      <AdminPageHeader title="Tags" eyebrow="Catalogue" description={`${data.meta.total} tag(s)`} action={{ href: '/admin/tags/nouveau', label: 'Nouveau tag' }} />
      <Suspense><TagsTable data={data.data} pagination={data.meta} /></Suspense>
    </>
  );
}
