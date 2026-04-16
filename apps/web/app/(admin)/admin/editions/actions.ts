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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createEditions(data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).post('festival', { json: data }).json();
    revalidatePath('/admin/editions');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEditions(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).put(`festival/${id}`, { json: data }).json();
    revalidatePath('/admin/editions');
    revalidatePath(`/admin/editions/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteEditions(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`festival/${id}`);
    revalidatePath('/admin/editions');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
