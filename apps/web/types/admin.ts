export type Locale = 'fr' | 'en' | 'de' | 'es' | 'it';
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'EDITOR';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'FAILED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'WAVE' | 'ORANGE_MONEY';

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ─── Translation ─────────────────────────────────────────────────
export interface AdminTranslation {
  locale: Locale;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ─── Product ─────────────────────────────────────────────────────
export interface AdminProductImage {
  id: string;
  imageUrl: string;
  altText?: string;
  position: number;
}

export interface AdminVariant {
  id?: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface AdminProduct {
  id: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  status: ProductStatus;
  featuredImageUrl?: string;
  images: AdminProductImage[];
  translations: AdminTranslation[];
  categories: Array<{ id: string; slug: string; name: string }>;
  tags: Array<{ id: string; slug: string; name: string }>;
  variants: AdminVariant[];
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────
export interface AdminCategory {
  id: string;
  slug: string;
  parentId?: string;
  translations: AdminTranslation[];
  createdAt: string;
}

// ─── Tag ─────────────────────────────────────────────────────────
export interface AdminTag {
  id: string;
  slug: string;
  translations: AdminTranslation[];
  createdAt: string;
}

// ─── Order ───────────────────────────────────────────────────────
export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  currency: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  customerEmail?: string;
  customerId?: string;
  customerName?: string;
  items: AdminOrderItem[];
  createdAt: string;
  updatedAt: string;
  // Shipping tracking (set by admin after dispatch)
  shippingCarrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

// ─── Quote ───────────────────────────────────────────────────────
export interface AdminQuote {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  budget?: number;
  status: 'NEW' | 'IN_REVIEW' | 'ANSWERED';
  createdAt: string;
}

// ─── User ────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  preferredLocale: Locale;
  emailVerified: boolean;
  createdAt: string;
}

// ─── CMS Entities ────────────────────────────────────────────────
export interface AdminPage {
  id: string;
  isPublished: boolean;
  translations: AdminTranslation[];
  createdAt: string;
}

export interface AdminService {
  id: string;
  featuredImageUrl?: string;
  isPublished: boolean;
  translations: AdminTranslation[];
  createdAt: string;
}

export interface AdminProject {
  id: string;
  slug: string;
  featuredImageUrl?: string;
  gallery: string[];
  completedAt?: string;
  clientName?: string;
  country?: string;
  isPublished: boolean;
  translations: AdminTranslation[];
  createdAt: string;
}

// ─── Festival ────────────────────────────────────────────────────
export interface AdminFestivalArtist {
  artistId: string;
  artistName: string;
  artistSlug: string;
  artistAvatarUrl?: string;
  artistFeaturedImageUrl?: string;
  role: string;
  stageOrder: number;
  performanceDate?: string;
}

export interface AdminArtist {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  avatarUrl?: string;
  featuredImageUrl?: string;
  instagramUrl?: string;
  genre?: string;
  nationality?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  videoUrl?: string;
  gallery: string[];
  isPublished: boolean;
  translations: AdminTranslation[];
  createdAt: string;
}

export interface AdminFestivalEdition {
  id: string;
  slug: string;
  editionNumber: number;
  year: number;
  city?: string;
  country?: string;
  isPublished: boolean;
  featuredImageUrl?: string;
  heroImage?: string;
  gallery: string[];
  startDate?: string;
  endDate?: string;
  venue?: string;
  venueAddress?: string;
  ticketUrl?: string;
  videoUrl?: string;
  artists?: AdminFestivalArtist[];
  translations: AdminTranslation[];
  createdAt: string;
}

export interface AdminPressMention {
  id: string;
  source: string;
  title: string;
  url?: string;
  publishedAt?: string;
  imageUrl?: string;
  createdAt: string;
}

// ─── Navigation ──────────────────────────────────────────────────
export interface NavItem {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
