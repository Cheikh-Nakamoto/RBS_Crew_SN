'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function InteractiveTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tracking cursor offset relative to center of the element
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  // Spring settings for smooth physics-based animation
  const springConfig = { stiffness: 150, damping: 20, mass: 0.6 };
  
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Position of the cursor relative to the element's top-left corner
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;

    // Normalize coordinates between -0.5 and 0.5 (center is 0)
    const normalizedX = (relativeX / width) - 0.5;
    const normalizedY = (relativeY / height) - 0.5;

    // "Se détachera" (repel / float away): 
    // We translate the element in the direction of the cursor (magnetic feel)
    // and tilt it slightly on the opposite axes (3D depth).
    const maxTranslation = 20; // max shift in px
    const maxTilt = 8; // max rotation in degrees

    x.set(normalizedX * maxTranslation);
    y.set(normalizedY * maxTranslation);
    rotateX.set(-normalizedY * maxTilt);
    rotateY.set(normalizedX * maxTilt);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reset positions to center
    x.set(0);
    y.set(0);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-visible py-8 flex justify-center items-center"
      style={{ perspective: 1000 }} // Enable 3D perspective context
    >
      <motion.div
        // 1. Slide-in from bottom to top animation on load/scroll
        initial={{ y: 80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          type: 'spring',
          stiffness: 80,
          damping: 18,
          mass: 1,
        }}
        // Mouse event handlers for interactive hover
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          x: springX,
          y: springY,
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isHovered ? 1.025 : 1,
          boxShadow: isHovered
            ? '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px 5px rgba(255, 255, 255, 0.05)'
            : '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 0px 0px rgba(0, 0, 0, 0)',
        }}
        className="w-full border-t border-b border-white/10 bg-black/50 backdrop-blur-md cursor-pointer transition-shadow duration-300 overflow-hidden relative"
      >
        {/* Glow backdrop layer inside the element to enhance the "detaching" visual quality */}
        <motion.div
          animate={{
            opacity: isHovered ? 0.15 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-gradient-to-tr from-[var(--rbs-red)] via-transparent to-[var(--rbs-gold)] pointer-events-none mix-blend-screen z-[1]"
        />

        <img
          src="/oeuvre_transition.jpg"
          alt="Transition artistique"
          className="w-full h-auto object-cover select-none pointer-events-none relative z-0 transition-transform duration-300"
          style={{
            transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          }}
        />
      </motion.div>
    </div>
  );
}
