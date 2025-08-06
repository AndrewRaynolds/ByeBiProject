/**
 * Image Search Service
 * Servizio per la ricerca di immagini tramite API esterna
 */

interface ImageSearchResult {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
  source?: string;
}

interface ImageSearchResponse {
  success: boolean;
  images: ImageSearchResult[];
  total: number;
  message?: string;
}

class ImageSearchService {
  private apiKey: string;
  private baseUrl: string = 'https://api.unsplash.com'; // Default a Unsplash come fallback

  constructor() {
    this.apiKey = process.env.IMAGE_SEARCH_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ IMAGE_SEARCH_API_KEY not found in environment');
    } else {
      console.log('✅ IMAGE_SEARCH_API_KEY configured successfully');
    }
  }

  /**
   * Cerca immagini per query
   */
  async searchImages(
    query: string, 
    limit: number = 20,
    orientation: 'all' | 'landscape' | 'portrait' = 'all'
  ): Promise<ImageSearchResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          images: [],
          total: 0,
          message: 'API key non configurata'
        };
      }

      // Usa Unsplash API come esempio (sostituisci con la tua API)
      const url = `${this.baseUrl}/search/photos`;
      const params = new URLSearchParams({
        query: query,
        per_page: limit.toString(),
        orientation: orientation === 'all' ? '' : orientation,
        client_id: this.apiKey
      });

      console.log(`🔍 Searching images for: "${query}"`);
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ByeBro-Travel/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Trasforma i risultati Unsplash nel formato standard
      const images: ImageSearchResult[] = data.results?.map((item: any) => ({
        id: item.id,
        url: item.urls?.full || item.urls?.regular,
        thumbnail: item.urls?.thumb || item.urls?.small,
        title: item.description || item.alt_description || 'Immagine',
        description: item.description,
        width: item.width,
        height: item.height,
        source: 'Unsplash'
      })) || [];

      console.log(`✅ Found ${images.length} images for "${query}"`);

      return {
        success: true,
        images,
        total: data.total || images.length,
        message: `Trovate ${images.length} immagini`
      };

    } catch (error: any) {
      console.error('❌ Error searching images:', error);
      
      return {
        success: false,
        images: [],
        total: 0,
        message: `Errore nella ricerca: ${error.message}`
      };
    }
  }

  /**
   * Cerca immagini specifiche per destinazioni di viaggio
   */
  async searchDestinationImages(destination: string, count: number = 10): Promise<ImageSearchResponse> {
    const queries = [
      `${destination} travel destination`,
      `${destination} cityscape`,
      `${destination} landmarks`,
      `${destination} nightlife`
    ];

    try {
      // Cerca con query multiple e combina i risultati
      const allResults = await Promise.all(
        queries.map(query => this.searchImages(query, Math.ceil(count / queries.length)))
      );

      const combinedImages: ImageSearchResult[] = [];
      allResults.forEach(result => {
        if (result.success) {
          combinedImages.push(...result.images);
        }
      });

      // Rimuovi duplicati e limita il numero
      const uniqueImages = combinedImages
        .filter((image, index, self) => self.findIndex(i => i.id === image.id) === index)
        .slice(0, count);

      return {
        success: true,
        images: uniqueImages,
        total: uniqueImages.length,
        message: `Trovate ${uniqueImages.length} immagini per ${destination}`
      };

    } catch (error: any) {
      console.error(`❌ Error searching destination images for ${destination}:`, error);
      
      return {
        success: false,
        images: [],
        total: 0,
        message: `Errore nella ricerca per ${destination}`
      };
    }
  }

  /**
   * Test della connessione API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'IMAGE_SEARCH_API_KEY non configurata'
        };
      }

      const result = await this.searchImages('test', 1);
      
      return {
        success: result.success,
        message: result.success ? 'API collegata correttamente' : result.message || 'Errore di connessione'
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Errore di connessione: ${error.message}`
      };
    }
  }
}

// Singleton instance
export const imageSearchService = new ImageSearchService();

// Export types
export type { ImageSearchResult, ImageSearchResponse };