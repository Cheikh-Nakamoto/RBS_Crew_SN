'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPages(data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).post('pages', { json: data }).json();
  revalidatePath('/admin/pages');
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePages(id: string, data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).put('pages/${id}', { json: data }).json();
  revalidatePath('/admin/pages');
  revalidatePath('/admin/pages/${id}');
  return result;
}

export async function deletePages(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete('pages/${id}');
  revalidatePath('/admin/pages');
}
