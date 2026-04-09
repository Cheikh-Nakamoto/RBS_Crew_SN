'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ZoomIn } from 'lucide-react';
import { Lightbox } from '@/components/lightbox';

interface CollectionItem {
  title: string;
  image: string;
  tag: string;
  href: string;
  wide?: boolean;
}

export function CollectionGrid({ items }: { items: CollectionItem[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxImages = items.map(item => ({ src: item.image, alt: item.title }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`group relative overflow-hidden rounded-xl ${item.wide ? 'md:col-span-2 md:row-span-2' : ''}`}
          >
            <img
              src={item.image}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

            {/* Tag */}
            <div className="absolute top-2 left-2">
              <span className="tag-graffiti text-[9px]">{item.tag}</span>
            </div>

            {/* Zoom button */}
            <button
              onClick={() => setLightboxIndex(i)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label={`Voir ${item.title} en grand`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Title + link */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-display text-xs text-white uppercase tracking-wide leading-tight line-clamp-2 mb-1">
                {item.title}
              </p>
              <Link
                href={item.href}
                className="text-[10px] text-white/50 hover:text-[oklch(0.55_0.18_15)] transition-colors duration-200 flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                Voir plus <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>

            <div className="absolute inset-0 ring-1 ring-white/8 group-hover:ring-[oklch(0.55_0.18_15/40%)] rounded-xl transition-all duration-300" />
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => i !== null ? (i - 1 + lightboxImages.length) % lightboxImages.length : 0)}
          onNext={() => setLightboxIndex(i => i !== null ? (i + 1) % lightboxImages.length : 0)}
        />
      )}
    </>
  );
}
