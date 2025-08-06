import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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

export default function ImageTestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [apiStatus, setApiStatus] = useState<string>('');
  const { toast } = useToast();

  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/images/test');
      const result = await response.json();
      
      setApiStatus(result.success ? '✅ Connesso' : '❌ Errore');
      
      toast({
        title: result.success ? "API Funzionante" : "Errore API",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      setApiStatus('❌ Errore di connessione');
      toast({
        title: "Errore",
        description: "Impossibile testare l'API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchImages = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Query vuota",
        description: "Inserisci una query di ricerca",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/images/search?query=${encodeURIComponent(searchQuery)}&limit=12`);
      const result: ImageSearchResponse = await response.json();
      
      if (result.success) {
        setResults(result.images);
        toast({
          title: "Ricerca completata",
          description: `Trovate ${result.images.length} immagini`,
        });
      } else {
        toast({
          title: "Errore ricerca",
          description: result.message || "Errore sconosciuto",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Errore durante la ricerca",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchDestinationImages = async (destination: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/images/destinations/${destination}?count=8`);
      const result: ImageSearchResponse = await response.json();
      
      if (result.success) {
        setResults(result.images);
        toast({
          title: `Immagini per ${destination}`,
          description: `Trovate ${result.images.length} immagini`,
        });
      } else {
        toast({
          title: "Errore ricerca",
          description: result.message || "Errore sconosciuto",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Errore durante la ricerca destinazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              🔍 Test API Ricerca Immagini
            </CardTitle>
            <CardDescription className="text-center">
              Test dell'integrazione con l'API per la ricerca di immagini
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test connessione API */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={testApiConnection}
                disabled={isLoading}
                variant="outline"
              >
                Test Connessione API
              </Button>
              <span className="text-sm font-medium">{apiStatus}</span>
            </div>

            {/* Ricerca generale */}
            <div className="flex gap-2">
              <Input
                placeholder="Cerca immagini (es: 'ibiza beach')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchImages()}
              />
              <Button 
                onClick={searchImages}
                disabled={isLoading || !searchQuery.trim()}
              >
                Cerca
              </Button>
            </div>

            {/* Ricerca destinazioni */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Test destinazioni:</span>
              {['Ibiza', 'Roma', 'Barcellona', 'Amsterdam'].map((dest) => (
                <Button
                  key={dest}
                  variant="secondary"
                  size="sm"
                  onClick={() => searchDestinationImages(dest)}
                  disabled={isLoading}
                >
                  {dest}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risultati ricerca */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Risultati Ricerca ({results.length} immagini)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((image) => (
                  <div key={image.id} className="space-y-2">
                    <img
                      src={image.thumbnail || image.url}
                      alt={image.title}
                      className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      loading="lazy"
                    />
                    <div className="text-xs space-y-1">
                      <p className="font-medium line-clamp-2">{image.title}</p>
                      {image.description && (
                        <p className="text-gray-600 line-clamp-1">{image.description}</p>
                      )}
                      <p className="text-gray-500">
                        {image.width}x{image.height} • {image.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Ricerca in corso...</p>
          </div>
        )}
      </div>
    </div>
  );
}