import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminQuotes } from '@/lib/admin/queries';
import { QuotesTable } from './_components/quotes-table';

interface DevisPageProps {
  searchParams: Promise<{ page?: string }>;
}

export const metadata = { title: 'Devis' };

export default async function DevisPage({ searchParams }: DevisPageProps) {
  const params = await searchParams;
  const data = await fetchAdminQuotes({ page: Number(params.page ?? 1), limit: 20 });

  return (
    <>
      <AdminPageHeader
        title="Devis"
        eyebrow="Ventes"
        description={`${data.meta.total} devis au total`}
      />
      <QuotesTable data={data.data} pagination={data.meta} />
    </>
  );
}
