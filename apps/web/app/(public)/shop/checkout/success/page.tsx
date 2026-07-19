import { Suspense } from 'react';
import { OrderStatusPoller } from './order-status-poller';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessPageContent searchParams={resolvedParams} />
    </Suspense>
  );
}

function SuccessPageContent({ searchParams }: { searchParams: { orderId?: string } }) {
  if (!searchParams.orderId) {
    return (
      <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center text-white/50">
        Commande introuvable.
      </div>
    );
  }

  return <OrderStatusPoller orderId={searchParams.orderId} />;
}
