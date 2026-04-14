'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function updateQuoteStatus(id: string, status: 'NEW' | 'IN_REVIEW' | 'ANSWERED') {
  const token = await getToken();
  const result = await getAdminApi(token).patch(`quotes/${id}/status`, { json: { status } }).json();
  revalidatePath('/admin/devis');
  revalidatePath(`/admin/devis/${id}`);
  return result;
}

export async function deleteQuote(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete(`quotes/${id}`);
  revalidatePath('/admin/devis');
}
