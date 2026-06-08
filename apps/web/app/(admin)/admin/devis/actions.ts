'use server';

import { revalidatePath } from 'next/cache';

import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';
export async function updateQuoteStatus(id: string, status: 'NEW' | 'IN_REVIEW' | 'ANSWERED'): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).patch(`quotes/${id}/status`, { json: { status } }).json();
    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteQuote(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getAdminToken();
    await getAdminApi(token).delete(`quotes/${id}`);
    revalidatePath('/admin/devis');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
