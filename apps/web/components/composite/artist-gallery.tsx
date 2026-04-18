'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface ArtistGalleryProps {
  artworks: Array<{ position: number; imageUrl: string }>;
}

export function ArtistGallery({ artworks }: ArtistGalleryProps) {
  const [index, setIndex] = useState(-1);

  if (!artworks || artworks.length === 0) return null;

  const slides = artworks.map((artwork) => ({ src: artwork.imageUrl }));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {artworks.map((artwork, idx) => (
          <div
            key={artwork.imageUrl}
            onClick={() => setIndex(idx)}
            className="cursor-pointer relative group overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 aspect-square shadow-lg"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <Image
              src={artwork.imageUrl}
              alt={`Artwork ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/90 via-[#09090b]/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-8">
              <span className="text-white/90 font-display text-lg tracking-wide translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                Agrandir
              </span>
              <div className="w-8 h-px bg-[oklch(0.72_0.19_48)] mt-3 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100 scale-x-0 group-hover:scale-x-100" />
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={slides}
      />
    </>
  );
}
