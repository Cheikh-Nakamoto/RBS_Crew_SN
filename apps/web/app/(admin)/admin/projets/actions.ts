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
export async function createProjets(data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).post('projects', { json: data }).json();
    revalidatePath('/admin/projets');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProjets(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).put(`projects/${id}`, { json: data }).json();
    revalidatePath('/admin/projets');
    revalidatePath(`/admin/projets/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteProjets(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`projects/${id}`);
    revalidatePath('/admin/projets');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
