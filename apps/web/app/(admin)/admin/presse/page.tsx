import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminPressMentions } from '@/lib/admin/queries';
import { PresseTable } from './_components/presse-table';

export const metadata = { title: 'Presse' };

export default async function PressePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const data = await fetchAdminPressMentions({ page: Number(params.page ?? 1), limit: 20 });

  return (
    <>
      <AdminPageHeader
        title="Presse"
        eyebrow="Contenu"
        description={`${data.meta.total} mention${data.meta.total > 1 ? 's' : ''}`}
        action={{ href: '/admin/presse/nouveau', label: 'Nouvelle mention' }}
      />
      <Suspense>
        <PresseTable data={data.data} pagination={data.meta} />
      </Suspense>
    </>
  );
}
