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

  constructor() {
    this.apiKey = process.env.IMAGE_SEARCH_API_KEY || '';
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

      // Test prima quale API stiamo usando
      console.log(`Cercando immagini per: ${query}`);
      console.log(`API Key presente: ${this.apiKey.substring(0, 10)}...`);

      // Prova con Unsplash API
      const unsplashUrl = `https://api.unsplash.com/search/photos`;
      const params = new URLSearchParams({
        query: query,
        per_page: limit.toString(),
        client_id: this.apiKey
      });

      const response = await fetch(`${unsplashUrl}?${params}`, {
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
        console.error(`API Error: ${response.status} - ${errorText}`);
        return {
          success: false,
          images: [],
          message: `Errore API: ${response.status} - ${errorText.substring(0, 100)}`
        };
      }

      const data = await response.json();
      console.log(`Risposta API ricevuta:`, JSON.stringify(data, null, 2).substring(0, 500));

      if (!data.results || !Array.isArray(data.results)) {
        return {
          success: false,
          images: [],
          message: 'Formato risposta API non valido'
        };
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
        message: `Trovate ${images.length} immagini`
      };

    } catch (error) {
      console.error('Errore nella ricerca immagini:', error);
      return {
        success: false,
        images: [],
        message: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      };
    }
  }

  /**
   * Cerca immagini specifiche per Barcellona con vista aerea e Sagrada Familia
   */
  async searchBarcelonaImages(): Promise<ImageSearchResponse> {
    const queries = [
      'Barcelona aerial view Sagrada Familia',
      'Barcelona skyline from above',
      'Barcelona cityscape aerial Sagrada Familia',
      'Barcelona overview architecture'
    ];

    for (const query of queries) {
      const result = await this.searchImages(query, 5);
      if (result.success && result.images.length > 0) {
        return result;
      }
    }

    return {
      success: false,
      images: [],
      message: 'Nessuna immagine trovata per Barcellona'
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