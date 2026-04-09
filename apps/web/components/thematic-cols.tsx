'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ZoomIn } from 'lucide-react';
import { Lightbox } from '@/components/lightbox';

interface ThematicCol {
  tag: string;
  title: string;
  image: string;
  href: string;
}

export function ThematicCols({ cols }: { cols: ThematicCol[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxImages = cols.map(c => ({ src: c.image, alt: c.title }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cols.map((col, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl aspect-[4/5]">
            <img
              src={col.image}
              alt={col.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            {/* Tag */}
            <div className="absolute top-4 left-4">
              <span className="tag-graffiti text-[10px]">{col.tag}</span>
            </div>

            {/* Zoom */}
            <button
              onClick={() => setLightboxIndex(i)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label={`Voir ${col.title} en grand`}
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-display text-base text-white uppercase tracking-wide leading-tight mb-1">
                {col.title}
              </p>
              <Link
                href={col.href}
                className="text-xs text-white/50 hover:text-[oklch(0.55_0.18_15)] transition-colors duration-200 flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                Voir plus <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="absolute inset-0 ring-1 ring-white/10 group-hover:ring-[oklch(0.55_0.18_15/40%)] rounded-2xl transition-all duration-300" />
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
