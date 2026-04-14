'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { CategoryFormValues } from '@/lib/admin/schemas';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function createCategory(data: CategoryFormValues) {
  const token = await getToken();
  const result = await getAdminApi(token).post('categories', { json: data }).json();
  revalidatePath('/admin/categories');
  return result;
}

export async function updateCategory(id: string, data: CategoryFormValues) {
  const token = await getToken();
  const result = await getAdminApi(token).put(`categories/${id}`, { json: data }).json();
  revalidatePath('/admin/categories');
  revalidatePath(`/admin/categories/${id}`);
  return result;
}

export async function deleteCategory(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete(`categories/${id}`);
  revalidatePath('/admin/categories');
}
