'use server';

import { revalidatePath } from 'next/cache';
import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';
import type { PressMentionFormValues } from '@/lib/admin/schemas';

export async function createPresse(data: PressMentionFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const payload = { ...data, featuredImageUrl: data.imageUrl };
    delete (payload as Record<string, unknown>).imageUrl;
    const result = await getAdminApi(token).post('press', { json: payload }).json();
    revalidatePath('/admin/presse');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function updatePresse(id: string, data: PressMentionFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const payload = { ...data, featuredImageUrl: data.imageUrl };
    delete (payload as Record<string, unknown>).imageUrl;
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
    const token = await getAdminToken();
    await getAdminApi(token).delete(`press/${id}`);
    revalidatePath('/admin/presse');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
