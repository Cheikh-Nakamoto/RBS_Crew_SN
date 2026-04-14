'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getAdminApi } from '@/lib/admin/api';
import type { ProductFormValues } from '@/lib/admin/schemas';

async function getToken() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new Error('Non autorisé');
  return token;
}

export async function createProduct(data: ProductFormValues) {
  const token = await getToken();
  const result = await getAdminApi(token).post('products', { json: data }).json();
  revalidatePath('/admin/produits');
  return result;
}

export async function updateProduct(id: string, data: ProductFormValues) {
  const token = await getToken();
  const result = await getAdminApi(token).put(`products/${id}`, { json: data }).json();
  revalidatePath('/admin/produits');
  revalidatePath(`/admin/produits/${id}`);
  return result;
}

export async function deleteProduct(id: string) {
  const token = await getToken();
  await getAdminApi(token).delete(`products/${id}`);
  revalidatePath('/admin/produits');
}
