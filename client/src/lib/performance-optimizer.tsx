import React, { useEffect, useRef } from 'react';

/**
 * Componente che applica ottimizzazioni di performance a livello globale
 * Migliora reattività di scroll, animazioni e interazioni utente
 */
export function PerformanceOptimizer(): JSX.Element {
  const isOptimized = useRef(false);

  useEffect(() => {
    if (isOptimized.current) return;
    
    // 1. Event Delegation per ridurre il numero di event listeners
    setupEventDelegation();
    
    // 2. Imposta passive: true per gli eventi di scroll per rendere lo scroll più fluido
    setupPassiveEvents();
    
    // 3. Imposta le proprietà CSS will-change solo durante lo scroll per risparmiare memoria
    setupWillChangeOptimization();
    
    // 4. Ottimizzazione delle animazioni CSS
    setupAnimationOptimizations();
    
    // 5. Ritarda i carichi non critici
    setupDeferredLoading();
    
    isOptimized.current = true;
    
    return () => {
      // Pulizia se necessario
    };
  }, []);

  // Renderizza un componente vuoto
  return <></>;
}

/**
 * Configura event delegation per minimizzare il numero di listeners
 */
function setupEventDelegation() {
  // Implementa event delegation per click comuni
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Delegazione per i button che hanno data-action
    if (target.closest('[data-action]')) {
      const button = target.closest('[data-action]') as HTMLElement;
      const action = button.getAttribute('data-action');
      
      if (action === 'scroll-to-top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, { passive: true });
}

/**
 * Configura gli eventi come passive per migliorare lo scroll
 */
function setupPassiveEvents() {
  // Test se passive è supportato
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function() {
        supportsPassive = true;
        return true;
      }
    });
    window.addEventListener('testPassive', null as any, opts);
    window.removeEventListener('testPassive', null as any, opts);
  } catch (e) {}
  
  // Configura gli eventi come passive
  if (supportsPassive) {
    const wheelOpt = supportsPassive ? { passive: true } : false;
    const wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
    
    window.addEventListener('touchstart', preventDefaultForScrolling, wheelOpt);
    window.addEventListener('touchmove', preventDefaultForScrolling, wheelOpt);
    window.addEventListener(wheelEvent, preventDefaultForScrolling, wheelOpt);
  }
}

/**
 * Previene i comportamenti di default che causano jank durante lo scroll
 */
function preventDefaultForScrolling(e: Event) {
  // Previene i comportamenti di default che causano jank solo in casi specifici
  const target = e.target as HTMLElement;
  
  // Controlla se l'elemento è scrollabile e non ha raggiunto i limiti
  if (target && target.scrollHeight > target.clientHeight) {
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Se stiamo scrollando normalmente in un elemento scrollabile, non preveniamo il default
    if (scrollTop > 0 && scrollTop < scrollHeight - clientHeight) {
      return;
    }
  }
}

/**
 * Ottimizza le proprietà CSS will-change per migliorare le performance
 */
function setupWillChangeOptimization() {
  let scrollTimeout: number;
  
  // Aggiungi will-change solo durante lo scroll
  window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    
    // Rimuovi will-change dopo che lo scroll si è fermato
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 100);
  }, { passive: true });
  
  // Aggiungi stile per applicare will-change
  const style = document.createElement('style');
  style.textContent = `
    .is-scrolling .fixed,
    .is-scrolling .sticky,
    .is-scrolling header,
    .is-scrolling [data-optimize-scroll] {
      will-change: transform;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Ottimizza le animazioni CSS
 */
function setupAnimationOptimizations() {
  const style = document.createElement('style');
  style.textContent = `
    @media screen and (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.001s !important;
        transition-duration: 0.001s !important;
      }
    }
    
    /* Usa transform e opacity invece di altre proprietà animabili */
    [data-optimize-animation] {
      transition-property: transform, opacity !important;
    }
    
    /* Forza accelerazione hardware su elementi animati */
    [data-hardware-accelerate] {
      transform: translateZ(0);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Ritarda i carichi non critici
 */
function setupDeferredLoading() {
  // Carica risorse non critiche solo dopo che la pagina è stata renderizzata
  window.addEventListener('load', () => {
    setTimeout(() => {
      const deferredScripts = document.querySelectorAll('script[data-defer]');
      deferredScripts.forEach(script => {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach(attr => {
          if (attr.name !== 'data-defer') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        newScript.appendChild(document.createTextNode(script.innerHTML));
        script.parentNode?.replaceChild(newScript, script);
      });
      
      // Carica immagini non critiche
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => {
        if (img instanceof HTMLImageElement && img.dataset.src) {
          img.src = img.dataset.src;
        }
      });
    }, 100);
  });
}

export default PerformanceOptimizer;