'use server';

import { revalidatePath } from 'next/cache';

import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import type { TagFormValues } from '@/lib/admin/schemas';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';
export async function createTag(data: TagFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).post('tags', { json: data }).json();
    revalidatePath('/admin/tags');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function updateTag(id: string, data: TagFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
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
    const token = await getAdminToken();
    await getAdminApi(token).delete(`tags/${id}`);
    revalidatePath('/admin/tags');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
