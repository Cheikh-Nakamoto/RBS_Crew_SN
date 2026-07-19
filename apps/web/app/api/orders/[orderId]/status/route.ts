import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  const { orderId } = await params;

  if (!session || !session.accessToken) {
    return NextResponse.json({ status: 'PENDING', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ status: 'PENDING' }, { status: 200 });
    }

    const order = await res.json();
    return NextResponse.json({ status: order.paymentStatus || 'PENDING' });
  } catch (err) {
    return NextResponse.json({ status: 'PENDING' }, { status: 200 });
  }
}
