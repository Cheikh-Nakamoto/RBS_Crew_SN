'use server';

import { revalidatePath } from 'next/cache';

import { getAdminApi } from '@/lib/admin/api';
import { getAdminToken } from '@/lib/admin/get-token';
import { parseApiError, type ActionResult } from '@/lib/admin/errors';

/**
 * Valide une demande : attribue le rôle ARTIST au compte ET le rattache à la
 * fiche choisie. Les deux vont ensemble — un rôle sans fiche donnerait un
 * espace artiste vide.
 */
export async function approveArtistClaim(userId: string, artistId: string): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token)
      .post(`artist-claims/${userId}/approve`, { json: { artistId } })
      .json();
    revalidatePath('/admin/artistes/demandes');
    revalidatePath('/admin/artistes');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}

export async function rejectArtistClaim(userId: string): Promise<ActionResult> {
  try {
    const token = await getAdminToken();
    const result = await getAdminApi(token).post(`artist-claims/${userId}/reject`).json();
    revalidatePath('/admin/artistes/demandes');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: await parseApiError(err) };
  }
}
