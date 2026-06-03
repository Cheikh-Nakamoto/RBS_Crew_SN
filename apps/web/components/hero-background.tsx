'use client';
import { useEffect, useState } from 'react';

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
    <>
      <img
        src="/hero_RBS.png"
        alt="hero background"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: 1,
          transition: "opacity 1.2s ease-in-out",
          filter: "grayscale(100%)",
          zIndex: 0
        }}
      />
    </>
  );
}
