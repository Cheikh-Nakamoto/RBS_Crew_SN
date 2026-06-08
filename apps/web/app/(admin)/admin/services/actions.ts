'use server';

import { revalidatePath } from 'next/cache';

import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createServices(data: any): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).post('services', { json: data }).json();
    revalidatePath('/admin/services');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateServices(id: string, data: any): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).put(`services/${id}`, { json: data }).json();
    revalidatePath('/admin/services');
    revalidatePath(`/admin/services/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteServices(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getAdminToken();
    await getAdminApi(token).delete(`services/${id}`);
    revalidatePath('/admin/services');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
