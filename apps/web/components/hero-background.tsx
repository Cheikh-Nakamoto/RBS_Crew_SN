'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface HeroBackgroundProps {
  images: string[];
  interval?: number; // ms between transitions, default 5000
}

export function HeroBackground({ images, interval = 5000 }: HeroBackgroundProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(c => {
        setPrev(c);
        return (c + 1) % images.length;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);
  return (
    <Image
      src="/hero_RBS.png"
      alt=""
      aria-hidden
      fill
      preload
      sizes="100vw"
      className="object-cover grayscale z-0"
    />
  );
}
