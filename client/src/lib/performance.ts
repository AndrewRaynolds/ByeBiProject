/**
 * Utility per migliorare le performance dell'applicazione
 */

/**
 * Funzione debounce per limitare la frequenza di esecuzione di una funzione
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Funzione per limitare il frame rate (throttle) di un'operazione
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Hook per l'intersezione di elementi - utile per il lazy loading
 */
export function useIsVisible(element: HTMLElement | null): boolean {
  if (!element || typeof IntersectionObserver !== 'function') return true;
  
  let visible = false;
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  
  observer.observe(element);
  
  return visible;
}

/**
 * Ottimizza le immagini con dimensioni specifiche
 */
export function optimizeImageUrl(
  url: string, 
  width: number, 
  height: number, 
  quality: number = 80
): string {
  if (!url) return '';
  
  // Se l'URL è un data URI, lo restituiamo così com'è
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Se è già un'immagine ottimizzata (come Unsplash), aggiungiamo i parametri di dimensione
  if (url.includes('unsplash.com')) {
    // Verifica se l'URL contiene già parametri di dimensione
    if (url.includes('&w=') || url.includes('&h=')) {
      return url;
    }
    
    // Aggiungi i parametri di dimensione e qualità
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&h=${height}&auto=format&q=${quality}&fit=crop`;
  }
  
  // Per le immagini di altri servizi che supportano dimensioni nell'URL
  if (url.includes('images.pexels.com') || url.includes('pixabay.com')) {
    // Verifica se l'URL contiene già parametri di dimensione
    if (url.includes('&w=') || url.includes('&h=') || url.includes('&size=')) {
      return url;
    }
    
    // Aggiungi i parametri di dimensione e qualità
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&h=${height}&auto=compress&q=${quality}`;
  }
  
  // Per le immagini senza supporto per parametri di dimensione
  return url;
}

/**
 * Precarica le immagini in background
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Applica la tecnica del CSS containment per ottimizzare il rendering
 */
export function applyContainment(element: HTMLElement, type: 'strict' | 'content' | 'size' | 'layout' | 'paint' = 'content'): void {
  if (!element) return;
  
  element.style.contain = type;
}