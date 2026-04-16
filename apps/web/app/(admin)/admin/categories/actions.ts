'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { CategoryFormValues } from '@/lib/admin/schemas';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function createCategory(data: CategoryFormValues): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).post('categories', { json: data }).json();
    revalidatePath('/admin/categories');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function updateCategory(id: string, data: CategoryFormValues): Promise<ActionResult> {
  try {
    const token = await getToken();
    const result = await getAdminApi(token).put(`categories/${id}`, { json: data }).json();
    revalidatePath('/admin/categories');
    revalidatePath(`/admin/categories/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getToken();
    await getAdminApi(token).delete(`categories/${id}`);
    revalidatePath('/admin/categories');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
