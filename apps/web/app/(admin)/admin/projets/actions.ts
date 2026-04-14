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
export async function createProjets(data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).post('projects', { json: data }).json();
  revalidatePath('/admin/projets');
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProjets(id: string, data: any) {
  const token = await getToken();
  const result = await getAdminApi(token).put('projects/${id}', { json: data }).json();
  revalidatePath('/admin/projets');
  revalidatePath('/admin/projets/${id}');
  return result;
}

export async function deleteProjets(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete('projects/${id}');
  revalidatePath('/admin/projets');
}
