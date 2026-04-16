'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { OrderStatusFormValues } from '@/lib/admin/schemas';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function updateOrderStatus(id: string, data: OrderStatusFormValues): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).patch(`orders/${id}/status`, { json: data }).json();
    revalidatePath('/admin/commandes');
    revalidatePath(`/admin/commandes/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteOrder(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`orders/${id}`);
    revalidatePath('/admin/commandes');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
