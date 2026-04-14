import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminUsers } from '@/lib/admin/queries';
import { UsersTable } from './_components/users-table';

interface UtilisateursPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export const metadata = { title: 'Utilisateurs' };

export default async function UtilisateursPage({ searchParams }: UtilisateursPageProps) {
  const params = await searchParams;
  const data = await fetchAdminUsers({
    page: Number(params.page ?? 1),
    limit: 20,
    search: params.search,
  });

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        eyebrow="Administration"
        description={`${data.meta.total} utilisateur${data.meta.total > 1 ? 's' : ''}`}
      />
      <Suspense>
        <UsersTable data={data.data} pagination={data.meta} />
      </Suspense>
    </>
  );
}
