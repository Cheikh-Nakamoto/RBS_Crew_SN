'use client';

import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { ImageGallery, type ImageData } from '../ui/carousel-circular-image-gallery';

interface FestivalGalleryProps {
  images: string[];
}

export function FestivalGallery({ images }: FestivalGalleryProps) {
  const [index, setIndex] = useState(-1);

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
              onClick={() => setIndex(i)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white/5 aspect-square border border-white/5 hover:border-[oklch(0.72_0.19_48/40%)] transition-all"
            >
              <img
                src={src}
                alt={`Gallery image ${i + 1}`}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-[oklch(0.72_0.19_48/0%)] group-hover:bg-[oklch(0.72_0.19_48/10%)] transition-colors duration-300 flex items-center justify-center">
                 <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-sm font-semibold py-2 px-4 rounded-full backdrop-blur-sm">
                   Agrandir
                 </span>
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
      </div>
    </>
  );
}
