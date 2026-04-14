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
export async function createArtistes(data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).post('artists', { json: data }).json();
  revalidatePath('/admin/artistes');
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateArtistes(id: string, data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).put('artists/${id}', { json: data }).json();
  revalidatePath('/admin/artistes');
  revalidatePath('/admin/artistes/${id}');
  return result;
}

export async function deleteArtistes(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete('artists/${id}');
  revalidatePath('/admin/artistes');
}
