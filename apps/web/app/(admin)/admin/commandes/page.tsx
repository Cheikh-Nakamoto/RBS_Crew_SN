import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { fetchAdminOrders } from '@/lib/admin/queries';
import { OrdersTable } from './_components/orders-table';

interface CommandesPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export const metadata = { title: 'Commandes' };

export default async function CommandesPage({ searchParams }: CommandesPageProps) {
  const params = await searchParams;
  const data = await fetchAdminOrders({
    page: Number(params.page ?? 1),
    limit: 20,
    status: params.status,
  });

  return (
    <>
      <AdminPageHeader
        title="Commandes"
        eyebrow="Ventes"
        description={`${data.meta.total} commande${data.meta.total > 1 ? 's' : ''}`}
      />
      <OrdersTable data={data.data} pagination={data.meta} />
    </>
  );
}
