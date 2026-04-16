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
export async function createArtistes(data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).post('artists', { json: data }).json();
    revalidatePath('/admin/artistes');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateArtistes(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).put(`artists/${id}`, { json: data }).json();
    revalidatePath('/admin/artistes');
    revalidatePath(`/admin/artistes/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteArtistes(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`artists/${id}`);
    revalidatePath('/admin/artistes');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
