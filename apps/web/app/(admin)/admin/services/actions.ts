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
export async function createServices(data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).post('services', { json: data }).json();
  revalidatePath('/admin/services');
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateServices(id: string, data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).put('services/${id}', { json: data }).json();
  revalidatePath('/admin/services');
  revalidatePath('/admin/services/${id}');
  return result;
}

export async function deleteServices(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete('services/${id}');
  revalidatePath('/admin/services');
}
