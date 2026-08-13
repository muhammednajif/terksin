"use client";

import React, { useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

export interface GlobeMarker {
  lat: number;
  lng: number;
  src?: string;
  label?: string;
  [key: string]: unknown;
}

interface Globe3DProps {
  markers?: GlobeMarker[];
  config?: {
    atmosphereColor?: string;
    atmosphereIntensity?: number;
    bumpScale?: number;
    autoRotateSpeed?: number;
  };
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  className?: string;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  markers = [],
  config = {},
  onMarkerClick,
  onMarkerHover,
  className,
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = config.autoRotateSpeed || 0.3;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = true;
      controls.rotateSpeed = 0.5;
    }
  }, [config.autoRotateSpeed, dimensions.width]);

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[400px] relative ${className || ""}`}>
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor={config.atmosphereColor || "#4da6ff"}
          atmosphereAltitude={config.atmosphereIntensity ? config.atmosphereIntensity / 100 : 0.15}
          htmlElementsData={markers}
          htmlElement={(d) => {
            const marker = d as GlobeMarker;
            const el = document.createElement("div");
            el.innerHTML = `
              <div class="flex flex-col items-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group pointer-events-auto">
                ${marker.src 
                  ? `<img src="${marker.src}" class="w-10 h-10 rounded-full border-[3px] border-brand-emerald object-cover shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-125 group-hover:border-black transition-all duration-300" />` 
                  : `<div class="w-4 h-4 bg-brand-emerald rounded-full border-2 border-black shadow-[0_0_10px_rgba(16,185,129,0.8)] group-hover:scale-125 transition-transform duration-300"></div>`
                }
                ${marker.label 
                  ? `<div class="mt-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-black/10 text-black text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-xl">
                      ${marker.label}
                    </div>` 
                  : ""}
              </div>
            `;
            el.style.pointerEvents = 'none';
            el.querySelector('.group')?.addEventListener('click', (e) => {
              e.stopPropagation();
              if (onMarkerClick) onMarkerClick(marker);
            });
            el.querySelector('.group')?.addEventListener('mouseenter', () => {
              if (onMarkerHover) onMarkerHover(marker);
            });
            el.querySelector('.group')?.addEventListener('mouseleave', () => {
              if (onMarkerHover) onMarkerHover(null);
            });
            return el;
          }}
          backgroundColor="rgba(0,0,0,0)"
          onZoom={({ altitude }) => {
            if (globeRef.current && altitude !== 2.5) {
              globeRef.current.pointOfView({ altitude: 2.5 }, 0);
            }
          }}
        />
      )}
    </div>
  );
};
