import { api } from '@/lib/api';
import type { ApiResponse, Product } from '@rbs/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatXOF } from '@/lib/format';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Props {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}

export const metadata = { title: 'Shop' };

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = params.page ?? '1';
  const search = params.search ?? '';
  const category = params.category ?? '';

  const query = new URLSearchParams({ page, limit: '20' });
  if (search) query.set('search', search);
  if (category) query.set('categorySlug', category);

  let data: ApiResponse<Product[]> | null = null;
  let fetchError = false;

  try {
    data = await api
      .get(`products?${query}`, {
        headers: { 'Accept-Language': 'fr' },
        cache: 'no-store',
      })
      .json<ApiResponse<Product[]>>();
  } catch {
    fetchError = true;
  }

  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Header */}
      <SectionHeader
        eyebrow="Boutique"
        title="Le Shop"
        subtitle="Merch officiel, prints, et créations sérigraphiées par le crew."
        className="mb-10"
      />

      {/* Search form */}
      <form className="mb-10">
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Rechercher un produit…"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.19_48/50%)] focus:border-[oklch(0.72_0.19_48/30%)] transition-all duration-200 text-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[oklch(0.72_0.19_48)] hover:bg-[oklch(0.80_0.19_48)] rounded-lg font-medium text-black text-xs transition-all duration-200"
          >
            Chercher
          </button>
        </div>
      </form>

      {/* Error state */}
      {fetchError && <ErrorState />}

      {/* Product grid */}
      {!fetchError && products.length === 0 && (
        <EmptyState
          title="Aucun produit trouvé"
          message={search ? `Aucun résultat pour "${search}"` : 'Le shop est vide pour le moment.'}
        />
      )}

      {!fetchError && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product, i) => {
            const translation = product.translations?.[0];
            return (
              <Link
                key={product.id}
                href={`/shop/${translation?.slug ?? product.slug}`}
                className="group"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Card className="bg-white/4 border-white/8 group-hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 card-hover h-full rounded-2xl overflow-hidden p-0">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-white/4">
                    {product.featuredImageUrl ? (
                      <Image
                        src={product.featuredImageUrl}
                        alt={translation?.name ?? ''}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-4xl text-white/10">
                        RBS
                      </div>
                    )}
                    {/* Out-of-stock overlay */}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="tag-graffiti text-white/70 border-white/30">Épuisé</span>
                      </div>
                    )}
                    {/* Promo badge */}
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-[oklch(0.60_0.25_345)] text-white border-0 text-xs font-semibold">
                          Promo
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm line-clamp-2 text-white group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200">
                      {translation?.name ?? '—'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[oklch(0.72_0.19_48)] font-bold text-sm">
                        {formatXOF(product.price)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-white/35 line-through text-xs">
                          {formatXOF(product.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex gap-2 justify-center flex-wrap">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/shop?page=${p}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`}
              aria-label={`Page ${p}`}
              aria-current={p === meta.page ? 'page' : undefined}
              className={`min-w-11 h-11 px-3 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/60 ${
                p === meta.page
                  ? 'bg-[var(--rbs-gold)] text-black shadow-[0_0_20px_oklch(0.72_0.19_48/0.35)]'
                  : 'bg-white/6 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
