import { useEffect, useRef, useState } from 'react';
import { throttle } from '@/lib/performance';

interface ScrollOptions {
  // Millisecondi di throttle per l'evento di scroll
  throttleMs?: number;
  // Offset per triggerare l'evento near-bottom
  bottomOffset?: number;
}

interface ScrollState {
  // Posizione corrente dello scroll
  scrollY: number;
  // Direzione dello scroll (positivo = verso il basso)
  direction: 'up' | 'down' | null;
  // Quanto si è scrollato dall'ultimo evento
  delta: number;
  // Se si è vicini al fondo della pagina
  isNearBottom: boolean;
  // Se si è scrollato abbastanza da nascondere elementi
  isScrolled: boolean;
}

/**
 * Hook che fornisce informazioni ottimizzate sullo scroll
 * 
 * @param options Opzioni di configurazione
 * @returns Stato dello scroll
 */
export function useOptimizedScroll(options: ScrollOptions = {}): ScrollState {
  const { 
    throttleMs = 100, 
    bottomOffset = 200 
  } = options;
  
  const [scrollY, setScrollY] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [delta, setDelta] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    const handleScroll = throttle(() => {
      const currentScrollY = window.scrollY;
      const currentDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
      const currentDelta = Math.abs(currentScrollY - lastScrollY.current);
      
      // Calcola se siamo vicini al fondo della pagina
      const nearBottom = 
        window.innerHeight + currentScrollY >= 
        document.documentElement.scrollHeight - bottomOffset;
      
      // Aggiorna lo stato
      setScrollY(currentScrollY);
      setDirection(currentDirection);
      setDelta(currentDelta);
      setIsNearBottom(nearBottom);
      setIsScrolled(currentScrollY > 50);
      
      // Salva l'ultimo valore di scroll
      lastScrollY.current = currentScrollY;
    }, throttleMs);
    
    // Imposta lo stato iniziale
    handleScroll();
    
    // Aggiungi l'evento listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [throttleMs, bottomOffset]);
  
  return {
    scrollY,
    direction,
    delta,
    isNearBottom,
    isScrolled
  };
}

/**
 * Scroll verso l'elemento specificato con animazione fluida
 */
export function scrollToElement(elementId: string, offset = 0): void {
  const element = document.getElementById(elementId);
  
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

/**
 * Disabilita temporaneamente lo scroll
 */
export function disableScroll(): () => void {
  const scrollY = window.scrollY;
  
  // Salva la posizione corrente
  const oldStyle = document.body.style.cssText;
  
  // Blocca lo scroll
  document.body.style.cssText = `
    overflow: hidden;
    position: fixed;
    top: -${scrollY}px;
    left: 0;
    right: 0;
    bottom: 0;
  `;
  
  // Funzione per ripristinare lo scroll
  return () => {
    document.body.style.cssText = oldStyle;
    window.scrollTo(0, scrollY);
  };
}