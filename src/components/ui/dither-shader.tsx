import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface DitherShaderProps {
  src: string;
  gridSize?: number;
  ditherMode?: 'bayer' | string;
  colorMode?: 'grayscale' | 'color';
  invert?: boolean;
  animated?: boolean;
  animationSpeed?: number;
  primaryColor?: string;
  secondaryColor?: string;
  threshold?: number;
  className?: string;
}

export const DitherShader: React.FC<DitherShaderProps> = ({
  src,
  gridSize = 2,
  ditherMode = 'bayer',
  colorMode = 'grayscale',
  invert = false,
  animated = false,
  animationSpeed = 0.02,
  primaryColor = '#000000',
  secondaryColor = '#f5f5f5',
  threshold = 0.5,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const renderDither = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = img.width;
    const h = img.height;

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const c1 = hexToRgb(primaryColor);
    const c2 = hexToRgb(secondaryColor);

    const bayerMatrix4x4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    
    const bayerThresholds = bayerMatrix4x4.map(row => row.map(v => (v + 0.5) / 16));

    const timeOffset = animated ? Math.sin(timeRef.current) * 0.1 : 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        let luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        
        if (invert) {
           luma = 1 - luma;
        }

        luma = Math.max(0, Math.min(1, luma + (threshold - 0.5) + timeOffset));

        const scaledX = Math.floor(x / gridSize);
        const scaledY = Math.floor(y / gridSize);
        const bayerThresh = bayerThresholds[scaledY % 4][scaledX % 4];

        const usePrimary = luma < bayerThresh;
        
        data[i] = usePrimary ? c1.r : c2.r;
        data[i+1] = usePrimary ? c1.g : c2.g;
        data[i+2] = usePrimary ? c1.b : c2.b;
        data[i+3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [animated, gridSize, invert, threshold, primaryColor, secondaryColor]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      imageRef.current = img;
      renderDither();
    };
  }, [src, renderDither]);

  useEffect(() => {
    if (animated) {
      const animate = () => {
        timeRef.current += animationSpeed;
        renderDither();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      renderDither();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gridSize, ditherMode, colorMode, invert, primaryColor, secondaryColor, threshold, animated, animationSpeed, renderDither]);

  return (
    <canvas 
      ref={canvasRef} 
      className={cn("w-full h-full object-cover", className)}
    />
  );
};
