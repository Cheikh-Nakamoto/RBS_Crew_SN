'use client';

import { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ImageGallery, type ImageData } from '../ui/carousel-circular-image-gallery';

const Lightbox = dynamic(() => import('./lightbox-lazy'), { ssr: false });

interface FestivalGalleryProps {
  images: string[];
}

export function FestivalGallery({ images }: FestivalGalleryProps) {
  const [index, setIndex] = useState(-1);
  // `dynamic` charge le chunk lightbox dès que le composant est monté, pas au
  // clic : on le monte donc seulement après la première ouverture, puis on le
  // garde monté pour préserver l'animation de fermeture.
  const [hasOpened, setHasOpened] = useState(false);

  const openLightbox = (i: number) => {
    setHasOpened(true);
    setIndex(i);
  };

  if (!images || images.length === 0) return null;

  const slides = images.map((src) => ({ src }));
  const galleryImages: ImageData[] = images.map((src, i) => ({
    url: src,
    title: `Image ${i + 1}`
  }));

  return (
    <>
      <div className="md:hidden w-full flex justify-center py-8 bg-black/20 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/5 relative">
        <ImageGallery images={galleryImages} />
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((src, i) => (
            <div
              key={i}
              onClick={() => openLightbox(i)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white/5 aspect-square border border-white/5 hover:border-[oklch(0.72_0.19_48/40%)] transition-all"
            >
              <Image
                src={src}
                alt={`Gallery image ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-[oklch(0.72_0.19_48/0%)] group-hover:bg-[oklch(0.72_0.19_48/10%)] transition-colors duration-300 flex items-center justify-center">
                 <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-sm font-semibold py-2 px-4 rounded-full backdrop-blur-sm">
                   Agrandir
                 </span>
              </div>
            </div>
          ))}
        </div>

        {hasOpened && (
          <Lightbox
            open={index >= 0}
            close={() => setIndex(-1)}
            index={index}
            slides={slides}
          />
        )}
      </div>
    </>
  );
}
