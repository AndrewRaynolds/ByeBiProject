import { useState, useEffect, useRef, memo } from "react";
import { optimizeImageUrl } from "@/lib/performance";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loadingMode?: "lazy" | "eager";
  quality?: number;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Component that optimizes images with lazy loading and placeholders
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width = 600,
  height = 400,
  className = "",
  loadingMode = "lazy",
  quality = 80,
  fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' font-size='6' text-anchor='middle' alignment-baseline='middle' font-family='sans-serif' fill='%23aaaaaa'%3EImage%3C/text%3E%3C/svg%3E",
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Ottimizza URL con dimensioni e qualità
  const optimizedSrc = error
    ? fallback
    : optimizeImageUrl(
        src,
        width,
        height,
        quality
      );

  useEffect(() => {
    // Reset lo stato se cambia la src
    if (src) {
      setIsLoaded(false);
      setError(false);
    }
  }, [src]);

  useEffect(() => {
    // Lazy loading con IntersectionObserver
    if (loadingMode === "lazy" && "IntersectionObserver" in window) {
      const img = imageRef.current;

      const handleIntersection: IntersectionObserverCallback = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (img && img.dataset.src) {
              // Carica l'immagine quando diventa visibile
              img.src = img.dataset.src;
              observer.current?.unobserve(img);
            }
          }
        });
      };

      observer.current = new IntersectionObserver(handleIntersection, {
        rootMargin: "200px 0px",  // Precarica quando l'immagine è a 200px di distanza
        threshold: 0.01,
      });

      if (img) observer.current.observe(img);

      return () => {
        if (img && observer.current) observer.current.unobserve(img);
      };
    }
  }, [loadingMode, optimizedSrc]);

  // Gestione eventi di caricamento
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
    if (onError) onError();
  };

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ position: "relative", width: "100%", height: "auto" }}
    >
      {/* Placeholder/skeleton mentre l'immagine carica */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <img
        ref={imageRef}
        src={loadingMode === "lazy" ? fallback : optimizedSrc}
        data-src={loadingMode === "lazy" ? optimizedSrc : undefined}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-auto transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        loading={loadingMode}
        decoding="async"
        {...props}
      />
    </div>
  );
});

export default OptimizedImage;