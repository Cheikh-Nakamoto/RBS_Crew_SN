'use server';

import { revalidatePath } from 'next/cache';

import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPages(data: any): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).post('pages', { json: data }).json();
    revalidatePath('/admin/pages');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePages(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).put(`pages/${id}`, { json: data }).json();
    revalidatePath('/admin/pages');
    revalidatePath(`/admin/pages/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deletePages(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getAdminToken();
    await getAdminApi(token).delete(`pages/${id}`);
    revalidatePath('/admin/pages');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
