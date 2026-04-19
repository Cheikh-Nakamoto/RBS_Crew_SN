"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnimatedUploadButtonProps {
  isUploading?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function AnimatedUploadButton({ isUploading, className, onClick }: AnimatedUploadButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)} 
      onClick={(e) => { 
        if (onClick) {
           e.stopPropagation();
           onClick();
        } 
      }}
    >
      <motion.div
        initial={{ width: 64, height: 64 }}
        whileHover={{ width: 200 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex items-center justify-center overflow-hidden relative shadow-lg transition-colors border",
          isUploading ? "bg-black/50 border-white/10" : "bg-black/80 border-[var(--rbs-red)]/50 hover:bg-black"
        )}
        style={{ borderRadius: 32 }}
      >
        <motion.div
          className="absolute"
          animate={{ 
            opacity: isHovered ? 0 : 1,
            scale: isHovered ? 0.8 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          {isUploading ? (
            <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <Upload className="text-[var(--rbs-red)] w-6 h-6" />
          )}
        </motion.div>

        <motion.div
          className="w-full flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2, delay: isHovered ? 0.1 : 0 }}
        >
          <span className="text-white text-sm uppercase tracking-widest font-bold whitespace-nowrap">
            {isUploading ? 'En cours...' : 'Sélectionner'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}
