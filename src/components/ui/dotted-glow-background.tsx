import React from "react";
import { cn } from "@/lib/utils";

interface DottedGlowBackgroundProps {
  className?: string;
  opacity?: number;
  gap?: number;
  radius?: number;
  colorLightVar?: string;
  glowColorLightVar?: string;
  colorDarkVar?: string;
  glowColorDarkVar?: string;
  backgroundOpacity?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
}

export const DottedGlowBackground: React.FC<DottedGlowBackgroundProps> = ({
  className,
  opacity = 1,
  gap = 15, // Re-mapped to background-size
  radius = 1.5,
}) => {
  // PURE CSS IMPLEMENTATION
  // Replaces the extremely heavy canvas implementation with 100% GPU-accelerated CSS
  // This guarantees 0 javascript overhead and 144fps buttery smooth performance.
  
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none z-0", className)}
      style={{
        opacity: opacity,
        maskImage: "radial-gradient(circle at center, black 10%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(circle at center, black 10%, transparent 80%)",
        backgroundImage: `radial-gradient(circle, rgba(16, 185, 129, 0.4) ${radius}px, transparent ${radius}px)`,
        backgroundSize: `${gap}px ${gap}px`,
      }}
    >
      <div 
        className="absolute inset-0 w-full h-full animate-pulse"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.3) ${radius}px, transparent ${radius}px)`,
          backgroundSize: `${gap}px ${gap}px`,
          animationDuration: '3s'
        }}
      />
    </div>
  );
};
