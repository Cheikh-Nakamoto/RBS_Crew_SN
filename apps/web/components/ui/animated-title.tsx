'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedTitleProps {
  titles?: string[];
  interval?: number;
  className?: string;
}

export function AnimatedTitle({ 
  titles = ['Graffiti', 'Sérigraphie', 'Street Art', 'Lifestyle'],
  interval = 2500,
  className = ''
}: AnimatedTitleProps) {
  const [titleNumber, setTitleNumber] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((prev) => (prev === titles.length - 1 ? 0 : prev + 1));
    }, interval);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles.length, interval]);

  return (
    <span className={`relative flex w-full overflow-hidden h-[1.1em] items-center ${className}`}>
      {titles.map((title, index) => (
        <motion.span
          key={index}
          className="absolute"
          initial={{ opacity: 0, y: '-100%' }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
          animate={
            titleNumber === index
              ? { y: 0, opacity: 1 }
              : { y: titleNumber > index ? '-100%' : '100%', opacity: 0 }
          }
        >
          {title}
        </motion.span>
      ))}
    </span>
  );
}
