import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminProducts } from '@/lib/admin/queries';
import { ProductsTable } from './_components/products-table';

interface ProduitsPageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export const metadata = { title: 'Produits' };

export default async function ProduitsPage({ searchParams }: ProduitsPageProps) {
  const params = await searchParams;
  const data = await fetchAdminProducts({
    page: Number(params.page ?? 1),
    limit: 20,
    search: params.search,
    status: params.status,
  });

  return (
    <>
      <AdminPageHeader
        title="Produits"
        eyebrow="Catalogue"
        description={`${data.meta.total} produit${data.meta.total > 1 ? 's' : ''} au total`}
        action={{ href: '/admin/produits/nouveau', label: 'Nouveau produit' }}
      />
      <Suspense>
        <ProductsTable data={data.data} pagination={data.meta} />
      </Suspense>
    </>
  );
}
