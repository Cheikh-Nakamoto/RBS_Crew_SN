'use server';

import { revalidatePath } from 'next/cache';
import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import type { OrderStatusFormValues } from '@/lib/admin/schemas';
import type { OrderStatus } from '@/types/admin';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

export async function updateOrderStatus(id: string, data: OrderStatusFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).patch(`orders/${id}/status`, { json: data }).json();
    revalidatePath('/admin/commandes');
    revalidatePath(`/admin/commandes/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  return updateOrderStatus(id, { status });
}

export async function deleteOrder(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getAdminToken();
    await getAdminApi(token).delete(`orders/${id}`);
    revalidatePath('/admin/commandes');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
