'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function updateQuoteStatus(id: string, status: 'NEW' | 'IN_REVIEW' | 'ANSWERED'): Promise<ActionResult> {
  try {
    const token = await getToken();
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
    const token = await getToken();
    await getAdminApi(token).delete(`quotes/${id}`);
    revalidatePath('/admin/devis');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
