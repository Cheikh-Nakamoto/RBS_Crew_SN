'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { TagFormValues } from '@/lib/admin/schemas';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function createTag(data: TagFormValues): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).post('tags', { json: data }).json();
    revalidatePath('/admin/tags');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function updateTag(id: string, data: TagFormValues): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).put(`tags/${id}`, { json: data }).json();
    revalidatePath('/admin/tags');
    revalidatePath(`/admin/tags/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteTag(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`tags/${id}`);
    revalidatePath('/admin/tags');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
