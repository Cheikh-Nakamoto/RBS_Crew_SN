import { api } from '@/lib/api';
import type { Product } from '@rbs/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { formatXOF } from '@/lib/format';
import { AddToCartButton } from '@/components/add-to-cart-button';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await api
      .get(`products/${slug}`, { headers: { 'Accept-Language': 'fr' } })
      .json<Product>();
  } catch {
    notFound();
  }

  const translation = product.translations?.[0];
  const inStock = product.stock > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Back link */}
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-10 transition-colors duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Retour au shop
      </Link>

      <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
        {/* Images column */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/4 border border-white/8">
            {product.featuredImageUrl ? (
              <Image
                src={product.featuredImageUrl}
                alt={translation?.name ?? ''}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/20">
                <Package className="w-16 h-16" />
                <span className="font-display text-2xl">RBS CREW</span>
              </div>
            )}
            {!inStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="tag-graffiti text-white/80 border-white/30 text-sm">Épuisé</span>
              </div>
            )}
          </div>

          {/* Thumbnail gallery */}
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-white/4 border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] transition-colors duration-200 cursor-pointer"
                >
                  <Image src={img.imageUrl} alt={translation?.name ?? ''} fill sizes="150px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="space-y-7">
          {/* Category tags */}
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((cat) => (
                <span key={cat.id} className="tag-graffiti">
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
            {translation?.name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-[oklch(0.72_0.19_48)]">
              {formatXOF(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-white/35 line-through text-xl">
                {formatXOF(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Stock badge */}
          <div>
            {inStock ? (
              <Badge className="bg-[oklch(0.65_0.20_140/15%)] text-[oklch(0.75_0.15_140)] border border-[oklch(0.65_0.20_140/30%)] px-3 py-1">
                ✓ {product.stock} en stock
              </Badge>
            ) : (
              <Badge className="bg-white/6 text-white/40 border border-white/12 px-3 py-1">
                Rupture de stock
              </Badge>
            )}
          </div>

          {/* Short description */}
          {translation?.shortDescription && (
            <p className="text-white/55 leading-relaxed text-base">{translation.shortDescription}</p>
          )}

          {/* Add to cart button */}
          <AddToCartButton
            productId={product.id}
            slug={translation?.slug ?? product.slug}
            name={translation?.name ?? 'Produit'}
            price={product.price}
            image={product.featuredImageUrl}
            maxStock={product.stock}
          />

          {/* SKU */}
          {product.sku && (
            <p className="text-xs text-white/25 font-mono">SKU : {product.sku}</p>
          )}

          {/* Full description */}
          {translation?.description && (
            <div className="pt-6 border-t border-white/8">
              <h2 className="font-semibold text-white/60 text-sm uppercase tracking-wider mb-4">
                Description
              </h2>
              <div
                className="prose prose-invert prose-sm max-w-none text-white/55 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: translation.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
