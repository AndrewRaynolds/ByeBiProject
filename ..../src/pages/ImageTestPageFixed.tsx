import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function ImageTestPageFixed() {
  const [query, setQuery] = useState('Barcelona aerial view');
  const [results, setResults] = useState<ImageSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const searchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/images/search?query=${encodeURIComponent(query)}&limit=6`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error searching images:', error);
      setResults({
        success: false,
        images: [],
        message: 'Errore nella ricerca'
      });
    }
    setLoading(false);
  };

  const testBarcelona = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/images/test');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error testing Barcelona images:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Image Search API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca immagini..."
              className="flex-1"
            />
            <Button onClick={searchImages} disabled={loading}>
              {loading ? 'Cercando...' : 'Cerca'}
            </Button>
            <Button onClick={testBarcelona} variant="outline" disabled={loading}>
              Test Barcellona
            </Button>
          </div>

          {results && (
            <div className="mt-6">
              <div className="mb-4 p-4 bg-gray-100 rounded">
                <p><strong>Success:</strong> {results.success ? 'Sì' : 'No'}</p>
                <p><strong>Message:</strong> {results.message}</p>
                <p><strong>Images Found:</strong> {results.images.length}</p>
              </div>

              {results.images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.images.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={image.url}
                          alt={image.description}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = image.thumbnail;
                          }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600 mb-2">{image.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {image.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">ID: {image.id}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}