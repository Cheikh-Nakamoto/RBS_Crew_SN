'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface MarqueeTextProps {
  children: ReactNode;
  className?: string;
  speed?: number; // px/s — default 40
}

/**
 * Scrolls overflowing text on hover — PlayStation-style.
 * Uses pure CSS for the hover trigger to prevent any JavaScript event bugs.
 * Detects .group hover automatically.
 */
export function MarqueeText({ children, className = '', speed = 40 }: MarqueeTextProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scrollConfig, setScrollConfig] = useState<{ distance: number; duration: number } | null>(null);

  // Measure overflow on mount and window resize
  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      
      const diff = inner.scrollWidth - outer.clientWidth;
      if (diff > 2) {
        setScrollConfig({ distance: diff, duration: diff / speed });
      }
    };
    
    // Slight delay to ensure fonts/layout are loaded
    const timeout = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', measure);
    };
  }, [speed, children]);

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden whitespace-nowrap ${className}`}
    >
      <span
        ref={innerRef}
        className="inline-block marquee-content"
        style={{
          // Default return transition (when mouse leaves)
          transitionProperty: 'transform',
          transitionDuration: '0.4s',
          transitionTimingFunction: 'ease-out',
          transform: 'translateX(0)',
          ...(scrollConfig && {
            '--scroll-dist': `-${scrollConfig.distance}px`,
            '--scroll-dur': `${scrollConfig.duration}s`,
          } as React.CSSProperties)
        }}
      >
        {children}
      </span>
      {scrollConfig && (
        <style>{`
          /* Pure CSS trigger : activates when the parent .group is hovered */
          .group:hover .marquee-content,
          .group:focus-within .marquee-content {
            transform: translateX(var(--scroll-dist)) !important;
            transition-duration: var(--scroll-dur) !important;
            transition-timing-function: linear !important;
          }
        `}</style>
      )}
    </div>
  );
}
