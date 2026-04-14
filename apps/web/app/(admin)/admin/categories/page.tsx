import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminCategories } from '@/lib/admin/queries';
import { CategoriesTable } from './_components/categories-table';

export const metadata = { title: 'Catégories' };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const data = await fetchAdminCategories({
    page: Number(params.page ?? 1),
    limit: 20,
    search: params.search,
  });

  return (
    <>
      <AdminPageHeader
        title="Catégories"
        eyebrow="Catalogue"
        description={`${data.meta.total} catégorie${data.meta.total > 1 ? 's' : ''}`}
        action={{ href: '/admin/categories/nouveau', label: 'Nouvelle catégorie' }}
      />
      <Suspense>
        <CategoriesTable data={data.data} pagination={data.meta} />
      </Suspense>
    </>
  );
}
