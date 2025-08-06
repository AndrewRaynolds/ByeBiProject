interface ImageResult {
  id: string;
  url: string;
  thumbnail: string;
  description: string;
  tags: string[];
}

interface ImageSearchResponse {
  success: boolean;
  images: ImageResult[];
  message?: string;
}

export class ImageSearchService {
  private apiKey: string;
  private provider: 'unsplash' | 'pexels' | 'fallback';

  constructor() {
    this.apiKey = process.env.IMAGE_SEARCH_API_KEY || '';
    // Determina provider basato su formato chiave o test
    this.provider = 'fallback';
  }

  /**
   * Cerca immagini usando l'API fornita dall'utente
   */
  async searchImages(query: string, limit: number = 10): Promise<ImageSearchResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          images: [],
          message: 'API key non configurata per la ricerca immagini'
        };
      }

      console.log(`Cercando immagini per: ${query}`);
      console.log(`API Key presente: ${this.apiKey.substring(0, 10)}...`);

      // Prima prova Pexels API
      let response: Response;
      try {
        const pexelsUrl = `https://api.pexels.com/v1/search`;
        const params = new URLSearchParams({
          query: query,
          per_page: limit.toString()
        });

        response = await fetch(`${pexelsUrl}?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Pexels API successful');
          
          if (data.photos && Array.isArray(data.photos)) {
            const images: ImageResult[] = data.photos.map((item: any) => ({
              id: item.id.toString(),
              url: item.src?.large || item.src?.original || '',
              thumbnail: item.src?.medium || item.src?.small || '',
              description: item.alt || '',
              tags: []
            }));

            return {
              success: true,
              images: images,
              message: `Trovate ${images.length} immagini da Pexels`
            };
          }
        } else {
          console.log('Pexels failed, trying Unsplash...');
        }
      } catch (error) {
        console.log('Pexels error, trying Unsplash...', error);
      }

      // Se Pexels fallisce, prova Unsplash
      const unsplashUrl = `https://api.unsplash.com/search/photos`;
      const unsplashParams = new URLSearchParams({
        query: query,
        per_page: limit.toString(),
        client_id: this.apiKey
      });

      response = await fetch(`${unsplashUrl}?${unsplashParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Unsplash API Error: ${response.status} - ${errorText}`);
        
        // Se entrambi falliscono, restituisce immagini di fallback
        return this.getFallbackImages(query);
      }

      const data = await response.json();
      console.log('Unsplash API successful');

      if (!data.results || !Array.isArray(data.results)) {
        return this.getFallbackImages(query);
      }

      const images: ImageResult[] = data.results.map((item: any) => ({
        id: item.id,
        url: item.urls?.regular || item.urls?.small || '',
        thumbnail: item.urls?.thumb || item.urls?.small || '',
        description: item.description || item.alt_description || '',
        tags: item.tags ? item.tags.map((tag: any) => tag.title || tag.name || '') : []
      }));

      return {
        success: true,
        images: images,
        message: `Trovate ${images.length} immagini da Unsplash`
      };

    } catch (error) {
      console.error('Errore nella ricerca immagini:', error);
      return this.getFallbackImages(query);
    }
  }

  /**
   * Fornisce immagini di fallback quando le API non funzionano
   */
  private getFallbackImages(query: string): ImageSearchResponse {
    const fallbackImages: ImageResult[] = [];
    
    if (query.toLowerCase().includes('barcelona') || query.toLowerCase().includes('barcellona')) {
      fallbackImages.push({
        id: 'barcelona-fallback-1',
        url: 'https://images.unsplash.com/photo-1544738413-433b2b94e57e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1544738413-433b2b94e57e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80',
        description: 'Barcelona aerial view with Sagrada Familia',
        tags: ['barcelona', 'sagrada familia', 'aerial', 'city']
      });
    } else {
      // Immagini generiche di viaggio
      fallbackImages.push({
        id: 'travel-fallback-1',
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80',
        description: 'Beautiful travel destination',
        tags: ['travel', 'destination', 'city']
      });
    }

    return {
      success: true,
      images: fallbackImages,
      message: 'Immagini di fallback fornite - configura IMAGE_SEARCH_API_KEY per API dinamiche'
    };
  }

  /**
   * Cerca immagini specifiche per Barcellona con vista aerea e Sagrada Familia
   */
  async searchBarcelonaImages(): Promise<ImageSearchResponse> {
    // Prova la ricerca dinamica prima
    const result = await this.searchImages('Barcelona aerial view Sagrada Familia', 5);
    if (result.success && result.images.length > 0) {
      return result;
    }

    // Se l'API fallisce, restituisci immagine specifica di Barcellona dall'alto
    return {
      success: true,
      images: [{
        id: 'barcelona-aerial-sagrada',
        url: 'https://images.unsplash.com/photo-1544738413-433b2b94e57e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1544738413-433b2b94e57e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80',
        description: 'Barcelona aerial view with Sagrada Familia - Perfect for bachelor party planning',
        tags: ['barcelona', 'sagrada familia', 'aerial view', 'cityscape']
      }],
      message: 'Immagine specifica di Barcellona dall\'alto fornita'
    };
  }

  /**
   * Cerca immagini per una destinazione specifica
   */
  async searchDestinationImages(destination: string, count: number = 10): Promise<ImageSearchResponse> {
    if (destination.toLowerCase().includes('barcellona') || destination.toLowerCase().includes('barcelona')) {
      return this.searchBarcelonaImages();
    }

    return this.searchImages(`${destination} travel destination`, count);
  }
}

export const imageSearchService = new ImageSearchService();