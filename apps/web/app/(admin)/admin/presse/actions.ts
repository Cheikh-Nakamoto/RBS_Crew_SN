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
export async function createPresse(data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const payload = { ...data, featuredImageUrl: data.imageUrl, imageUrl: undefined };
    const result = await getAdminApi(token).post('press', { json: payload }).json();
    revalidatePath('/admin/presse');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePresse(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const payload = { ...data, featuredImageUrl: data.imageUrl, imageUrl: undefined };
    const result = await getAdminApi(token).put(`press/${id}`, { json: payload }).json();
    revalidatePath('/admin/presse');
    revalidatePath(`/admin/presse/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deletePresse(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`press/${id}`);
    revalidatePath('/admin/presse');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
