import { z } from 'zod';

export const LOCALES = ['fr', 'en', 'de', 'es', 'it'] as const;

// ─── Shared ──────────────────────────────────────────────────────
// Strict schema — used when a single locale entry must be complete
export const translationSchema = z.object({
  locale: z.enum(LOCALES),
  title: z.string().min(1, 'Le titre est requis'),
  slug: z
    .string()
    .min(1, 'Le slug est requis')
    .regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres et tirets uniquement)'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

// Permissive schema — used in multi-locale forms where only filled locales are submitted
// title/slug may be empty; a .refine() on the parent array enforces at least one filled entry
export const permissiveTranslationSchema = z.object({
  locale: z.enum(LOCALES),
  title: z.string().default(''),
  slug: z
    .string()
    .default('')
    .refine(
      (v) => v === '' || /^[a-z0-9-]+$/.test(v),
      'Slug invalide (minuscules, chiffres et tirets uniquement)',
    ),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

// Reusable refine + helper — at least one locale must have both title and slug filled
const atLeastOneTranslation = [
  (ts: Array<{ title: string; slug: string }>) =>
    ts.some((t) => t.title.trim() !== '' && t.slug.trim() !== ''),
  { message: 'Au moins une traduction avec un titre et un slug est requise' },
] as const;

// ─── Product ─────────────────────────────────────────────────────
const attributePairSchema = z.object({
  key: z.string().min(1, 'Clé requise'),
  value: z.string().min(1, 'Valeur requise'),
});

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, 'Prix invalide'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, 'Stock invalide'),
  attributes: z.array(attributePairSchema).default([]),
});

export const productSchema = z.object({
  sku: z.string().optional(),
  price: z.coerce.number().min(0, 'Prix invalide'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, 'Stock invalide'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  featuredImageUrl: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  translations: z.array(permissiveTranslationSchema).refine(...atLeastOneTranslation),
  variants: z.array(variantSchema).default([]),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ─── Category ────────────────────────────────────────────────────
export const categorySchema = z.object({
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional(),
  translations: z.array(permissiveTranslationSchema).refine(...atLeastOneTranslation),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Tag ─────────────────────────────────────────────────────────
export const tagSchema = z.object({
  translations: z.array(permissiveTranslationSchema).refine(...atLeastOneTranslation),
});

export type TagFormValues = z.infer<typeof tagSchema>;

// ─── Simple translatable (Page, Service, Project, Artist, FestivalEdition) ───
export const simpleTranslatableSchema = z.object({
  featuredImageUrl: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  translations: z.array(permissiveTranslationSchema).refine(...atLeastOneTranslation),
});

export type SimpleTranslatableFormValues = z.infer<typeof simpleTranslatableSchema>;

// ─── Artist ──────────────────────────────────────────────────────
const urlOptional = z.string().url({ message: 'URL invalide' }).optional().or(z.literal(''));

export const artistSchema = simpleTranslatableSchema.extend({
  city: z.string().optional(),
  country: z.string().optional(),
  avatarUrl: z.string().optional(),
  instagramUrl: urlOptional,
  genre: z.string().optional(),
  nationality: z.string().optional(),
  facebookUrl: urlOptional,
  twitterUrl: urlOptional,
  youtubeUrl: urlOptional,
  tiktokUrl: urlOptional,
  websiteUrl: urlOptional,
  spotifyUrl: urlOptional,
  soundcloudUrl: urlOptional,
  videoUrl: urlOptional,
});

export type ArtistFormValues = z.infer<typeof artistSchema>;

// ─── Project ─────────────────────────────────────────────────────
export const projectSchema = simpleTranslatableSchema.extend({
  completedAt: z.string().optional(),
  clientName: z.string().optional(),
  country: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

// ─── Festival Edition ────────────────────────────────────────────
export const festivalEditionSchema = simpleTranslatableSchema.extend({
  editionNumber: z.coerce.number().int().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  city: z.string().optional(),
  country: z.string().optional().default('SN'),
  heroImage: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  ticketUrl: urlOptional,
  videoUrl: urlOptional,
});

export type FestivalEditionFormValues = z.infer<typeof festivalEditionSchema>;

// ─── Press Mention ────────────────────────────────────────────────
export const pressMentionSchema = z.object({
  source: z.string().min(1, 'La source est requise'),
  title: z.string().min(1, 'Le titre est requis'),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type PressMentionFormValues = z.infer<typeof pressMentionSchema>;

// ─── Order status update ─────────────────────────────────────────
export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED']),
});

export type OrderStatusFormValues = z.infer<typeof orderStatusSchema>;

// ─── User role update ─────────────────────────────────────────────
export const userRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ADMIN', 'EDITOR']),
});

export type UserRoleFormValues = z.infer<typeof userRoleSchema>;
