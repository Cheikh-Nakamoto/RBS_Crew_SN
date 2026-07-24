import { cache } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAdminApi } from './api';
import type {
  AdminProduct,
  AdminCategory,
  AdminTag,
  AdminOrder,
  AdminQuote,
  AdminUser,
  AdminPage,
  AdminService,
  AdminProject,
  AdminArtist,
  AdminFestivalEdition,
  AdminPressMention,
  PaginatedResponse,
} from '@/types/admin';

// ─── Helpers ─────────────────────────────────────────────────────
/**
 * Mémoïsé par `cache()` pour la durée d'un rendu : une page qui charge quatre
 * ressources en parallèle (cf. le tableau de bord) appellerait sinon `auth()`
 * quatre fois, donc quatre rotations concurrentes du refresh token pour un
 * seul affichage.
 */
const getToken = cache(async (): Promise<string> => {
  const session = await auth();
  // Pas de session OU session inutilisable → redirect
  if (!session?.accessToken) redirect('/login');
  if (session.error === 'SessionMaxAgeError') redirect('/login?reason=session_max_age');
  if (session.error) redirect('/login?reason=session_expired');
  return session.accessToken;
});

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return q.toString();
}

// ─── Options de formulaire ───────────────────────────────────────
/**
 * Listes `{id, name}` destinées aux <Select> : les endpoints de liste complets
 * rapatriaient des entités entières (traductions incluses) pour n'en garder que
 * l'identifiant et le libellé.
 */
export interface AdminOption {
  id: string;
  name: string;
  /** Fiche artiste déjà rattachée à un compte (artistes uniquement). */
  taken?: boolean;
}

async function fetchOptions(resource: string): Promise<AdminOption[]> {
  const token = await getToken();
  const res = await getAdminApi(token)
    .get(`${resource}/options`)
    .json<{ data: AdminOption[] }>();
  return res.data ?? [];
}

export const fetchCategoryOptions = () => fetchOptions('categories');
export const fetchTagOptions = () => fetchOptions('tags');
export const fetchArtistOptions = () => fetchOptions('artists');

// ─── Dashboard ───────────────────────────────────────────────────
export interface AdminDashboardStats {
  pendingOrders: number;
  users: number;
  publishedProducts: number;
  quotes: number;
}

export async function fetchAdminStats(): Promise<AdminDashboardStats> {
  const token = await getToken();
  return getAdminApi(token).get('stats').json();
}

// ─── Products ────────────────────────────────────────────────────
export async function fetchAdminProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedResponse<AdminProduct>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20, search: params.search, status: params.status });
  return getAdminApi(token).get(`products?${q}`).json();
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const token = await getToken();
  return getAdminApi(token).get(`products/${id}`).json();
}

// ─── Categories ──────────────────────────────────────────────────
export async function fetchAdminCategories(params: { page?: number; limit?: number; search?: string } = {}): Promise<PaginatedResponse<AdminCategory>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 50, search: params.search });
  return getAdminApi(token).get(`categories?${q}`).json();
}

export async function fetchAdminCategory(id: string): Promise<AdminCategory> {
  const token = await getToken();
  return getAdminApi(token).get(`categories/${id}`).json();
}

// ─── Tags ────────────────────────────────────────────────────────
export async function fetchAdminTags(params: { page?: number; limit?: number; search?: string } = {}): Promise<PaginatedResponse<AdminTag>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 50, search: params.search });
  return getAdminApi(token).get(`tags?${q}`).json();
}

export async function fetchAdminTag(id: string): Promise<AdminTag> {
  const token = await getToken();
  return getAdminApi(token).get(`tags/${id}`).json();
}

// ─── Orders ──────────────────────────────────────────────────────
export async function fetchAdminOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<PaginatedResponse<AdminOrder>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20, status: params.status, search: params.search });
  return getAdminApi(token).get(`orders?${q}`).json();
}

export async function fetchAdminOrder(id: string): Promise<AdminOrder> {
  const token = await getToken();
  return getAdminApi(token).get(`orders/${id}`).json();
}

// ─── Quotes ──────────────────────────────────────────────────────
export async function fetchAdminQuotes(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminQuote>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`quotes?${q}`).json();
}

export async function fetchAdminQuote(id: string): Promise<AdminQuote> {
  const token = await getToken();
  return getAdminApi(token).get(`quotes/${id}`).json();
}

// ─── Users ───────────────────────────────────────────────────────
export async function fetchAdminUsers(params: { page?: number; limit?: number; search?: string } = {}): Promise<PaginatedResponse<AdminUser>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20, search: params.search });
  return getAdminApi(token).get(`users?${q}`).json();
}

export async function fetchAdminUser(id: string): Promise<AdminUser> {
  const token = await getToken();
  return getAdminApi(token).get(`users/${id}`).json();
}

// ─── Pages ───────────────────────────────────────────────────────
export async function fetchAdminPages(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminPage>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`pages?${q}`).json();
}

export async function fetchAdminPage(id: string): Promise<AdminPage> {
  const token = await getToken();
  return getAdminApi(token).get(`pages/${id}`).json();
}

// ─── Services ────────────────────────────────────────────────────
export async function fetchAdminServices(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminService>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`services?${q}`).json();
}

export async function fetchAdminService(id: string): Promise<AdminService> {
  const token = await getToken();
  return getAdminApi(token).get(`services/${id}`).json();
}

// ─── Projects ────────────────────────────────────────────────────
export async function fetchAdminProjects(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminProject>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`projects?${q}`).json();
}

export async function fetchAdminProject(id: string): Promise<AdminProject> {
  const token = await getToken();
  return getAdminApi(token).get(`projects/${id}`).json();
}

// ─── Artists ─────────────────────────────────────────────────────
export async function fetchAdminArtists(params: { page?: number; limit?: number; search?: string } = {}): Promise<PaginatedResponse<AdminArtist>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20, search: params.search });
  return getAdminApi(token).get(`artists?${q}`).json();
}

export async function fetchAdminArtist(id: string): Promise<AdminArtist> {
  const token = await getToken();
  return getAdminApi(token).get(`artists/${id}`).json();
}

export interface ArtistClaim {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  status: string;
  note: string | null;
  requestedAt: string | null;
  linkedArtistId: string | null;
}

/** Demandes « je suis un artiste RBS » en attente de validation. */
export async function fetchArtistClaims(status = 'PENDING'): Promise<ArtistClaim[]> {
  const token = await getToken();
  return getAdminApi(token).get(`artist-claims?status=${status}`).json();
}

// ─── Festival Editions ───────────────────────────────────────────
export async function fetchAdminFestivalEditions(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminFestivalEdition>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`festival?${q}`).json();
}

export async function fetchAdminFestivalEdition(id: string): Promise<AdminFestivalEdition> {
  const token = await getToken();
  return getAdminApi(token).get(`festival/${id}`).json();
}

// ─── Press Mentions ──────────────────────────────────────────────
export async function fetchAdminPressMentions(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AdminPressMention>> {
  const token = await getToken();
  const q = buildQuery({ page: params.page ?? 1, limit: params.limit ?? 20 });
  return getAdminApi(token).get(`press?${q}`).json();
}

export async function fetchAdminPressMention(id: string): Promise<AdminPressMention> {
  const token = await getToken();
  return getAdminApi(token).get(`press/${id}`).json();
}
