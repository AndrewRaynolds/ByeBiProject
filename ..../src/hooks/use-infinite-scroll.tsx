import { useState, useEffect, useRef, useCallback } from 'react';
import { throttle } from '@/lib/performance';

interface InfiniteScrollOptions {
  /** Numero di elementi da caricare per pagina */
  pageSize?: number;
  /** Threshold per caricare altri elementi prima di raggiungere la fine della lista (pixel) */
  threshold?: number;
  /** Delay in ms per throttle della funzione di scroll */
  throttleDelay?: number;
  /** Se true, carica automaticamente nuovi dati quando l'utente è vicino alla fine della lista */
  autoLoad?: boolean;
}

/**
 * Hook per implementare infinite scroll in modo ottimizzato
 * 
 * @param totalItems Numero totale di items disponibili
 * @param options Opzioni di configurazione
 * @returns Oggetto con visibleItems, hasMore, loadMore, containerRef
 */
export function useInfiniteScroll<T>(
  items: T[],
  options: InfiniteScrollOptions = {}
) {
  const {
    pageSize = 10,
    threshold = 200,
    throttleDelay = 200,
    autoLoad = true,
  } = options;

  const [visibleItemsCount, setVisibleItemsCount] = useState(pageSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Calcola se ci sono altri elementi da caricare
  const hasMore = visibleItemsCount < items.length;

  // Carica più elementi
  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleItemsCount(prev => Math.min(prev + pageSize, items.length));
    }
  }, [hasMore, items.length, pageSize]);

  // Throttle della funzione loadMore per evitare chiamate eccessive
  const throttledLoadMore = throttle(loadMore, throttleDelay);

  // Usiamo IntersectionObserver per rilevare quando siamo vicini alla fine della lista
  useEffect(() => {
    if (autoLoad && loadingRef.current) {
      observer.current = new IntersectionObserver(
        entries => {
          const target = entries[0];
          if (target.isIntersecting && hasMore) {
            throttledLoadMore();
          }
        },
        {
          root: null,
          rootMargin: `0px 0px ${threshold}px 0px`,
          threshold: 0.1,
        }
      );

      observer.current.observe(loadingRef.current);

      return () => {
        if (observer.current && loadingRef.current) {
          observer.current.unobserve(loadingRef.current);
        }
      };
    }
  }, [hasMore, throttledLoadMore, threshold, autoLoad]);

  // Calcola gli elementi visibili
  const visibleItems = items.slice(0, visibleItemsCount);

  return {
    visibleItems,
    hasMore,
    loadMore: throttledLoadMore,
    containerRef,
    loadingRef,
  };
}

interface VirtualListOptions {
  /** Altezza approssimativa di ogni item in pixel */
  itemHeight?: number;
  /** Numero di elementi di overscan (elementi renderizzati ma non visibili) */
  overscan?: number;
}

/**
 * Hook per implementare virtual list (windowing) per liste molto lunghe
 * Rende solo gli elementi visibili nella viewport + overscan
 */
export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions = {}
) {
  const { 
    itemHeight = 50, 
    overscan = 3 
  } = options;
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcola l'intervallo di elementi visibili basato sullo scroll
  const calculateVisibleRange = useCallback(
    throttle(() => {
      if (!containerRef.current) return;

      const { scrollTop, clientHeight } = containerRef.current;
      
      // Calcola gli indici di inizio e fine
      let start = Math.floor(scrollTop / itemHeight) - overscan;
      let end = Math.ceil((scrollTop + clientHeight) / itemHeight) + overscan;
      
      // Assicurati che gli indici siano nell'intervallo corretto
      start = Math.max(0, start);
      end = Math.min(items.length, end);
      
      setVisibleRange({ start, end });
    }, 100),
    [items.length, itemHeight, overscan]
  );

  // Aggiungi event listener per lo scroll
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', calculateVisibleRange, { passive: true });
      // Calcola l'intervallo iniziale
      calculateVisibleRange();
      
      return () => {
        container.removeEventListener('scroll', calculateVisibleRange);
      };
    }
  }, [calculateVisibleRange]);

  // Elementi visibili e spaziatori
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    itemHeight,
  };
}