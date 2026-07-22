'use server';

import { revalidatePath } from 'next/cache';
import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import type { UserRoleFormValues } from '@/lib/admin/schemas';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

export async function updateUserRole(id: string, data: UserRoleFormValues): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).put(`users/${id}/role`, { json: data }).json();
    revalidatePath('/admin/utilisateurs');
    revalidatePath(`/admin/utilisateurs/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function deleteUser(id: string): Promise<ActionResult<void>> {
  try {
    const token = await getAdminToken();
    await getAdminApi(token).delete(`users/${id}`);
    revalidatePath('/admin/utilisateurs');
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

/**
 * Filet de sécurité : valider l'adresse d'un client dont l'e-mail de
 * vérification n'arrive pas (spam, adresse invalide, panne SMTP). Sans ça,
 * un tel client ne peut jamais commander.
 */
export async function verifyUserEmail(id: string): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).post(`users/${id}/verify-email`).json();
    revalidatePath('/admin/utilisateurs');
    revalidatePath(`/admin/utilisateurs/${id}`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
