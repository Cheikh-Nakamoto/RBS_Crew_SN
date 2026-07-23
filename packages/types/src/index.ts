// ─────────────────────────────────────────────
// Shared types between apps/web and apps/api
// ─────────────────────────────────────────────

export type Locale = 'fr' | 'en' | 'de' | 'es' | 'it';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'EDITOR' | 'ARTIST';

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// ── API Response wrapper ─────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ── Product ──────────────────────────────────

export interface ProductTranslation {
  locale: Locale;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  position: number;
}

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  status: ProductStatus;
  featuredImageUrl?: string;
  images: ProductImage[];
  translations: ProductTranslation[];
  categories: CategorySummary[];
  tags: TagSummary[];
}

export interface ProductSummary {
  id: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  status: ProductStatus;
  featuredImageUrl?: string;
  name: string;
  shortDescription?: string;
}

// ── Category ─────────────────────────────────

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export interface Category extends CategorySummary {
  description?: string;
  parentId?: string;
  children: CategorySummary[];
}

// ── Tag ──────────────────────────────────────

export interface TagSummary {
  id: string;
  slug: string;
  name: string;
}

// ── Order ────────────────────────────────────

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

// ── User ─────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  preferredLocale: Locale;
}

export interface Address {
  id: string;
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ── Page ─────────────────────────────────────

export interface Page {
  id: string;
  slug: string;
  template?: string;
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ── Service ──────────────────────────────────

export interface Service {
  id: string;
  slug: string;
  icon?: string;
  title: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ── Project ──────────────────────────────────

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content?: string;
  clientName?: string;
  completedAt?: string;
  featuredImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}
