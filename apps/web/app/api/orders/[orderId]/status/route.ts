import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '@/lib/api-base';

const API_URL = API_BASE;

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
