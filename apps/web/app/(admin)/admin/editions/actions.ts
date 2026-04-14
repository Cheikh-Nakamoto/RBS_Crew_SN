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
export async function createEditions(data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).post('festival', { json: data }).json();
  revalidatePath('/admin/editions');
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEditions(id: string, data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).put(`festival/${id}`, { json: data }).json();
  revalidatePath('/admin/editions');
  revalidatePath(`/admin/editions/${id}`);
  return result;
}

export async function deleteEditions(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete(`festival/${id}`);
  revalidatePath('/admin/editions');
}
