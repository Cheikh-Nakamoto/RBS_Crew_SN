'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { UserRoleFormValues } from '@/lib/admin/schemas';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function updateUserRole(id: string, data: UserRoleFormValues) {
  const token = await getToken();
  const result = await getAdminApi(token).put(`users/${id}/role`, { json: data }).json();
  revalidatePath('/admin/utilisateurs');
  revalidatePath(`/admin/utilisateurs/${id}`);
  return result;
}

export async function deleteUser(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete(`users/${id}`);
  revalidatePath('/admin/utilisateurs');
}
