import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plane, MapPin, Calendar, Users, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KiwiTestResult {
  connected: boolean;
  message: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
  country: {
    name: string;
    code: string;
  };
  type: string;
}

interface ItineraryRequest {
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  budget: 'budget' | 'standard' | 'luxury';
  interests: string[];
}

export default function KiwiTestPage() {
  const [testResult, setTestResult] = useState<KiwiTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [itineraryData, setItineraryData] = useState<ItineraryRequest>({
    destination: '',
    departureCity: '',
    startDate: '',
    endDate: '',
    groupSize: 4,
    budget: 'standard',
    interests: ['nightlife', 'food', 'entertainment']
  });
  const [generatedItinerary, setGeneratedItinerary] = useState<any>(null);
  const { toast } = useToast();

  const testKiwiConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/kiwi/test');
      const result = await response.json();
      setTestResult(result);
      
      toast({
        title: result.connected ? "Connessione riuscita" : "Connessione fallita",
        description: result.message,
        variant: result.connected ? "default" : "destructive"
      });
    } catch (error) {
      setTestResult({
        connected: false,
        message: "Errore di rete durante il test"
      });
      toast({
        title: "Errore",
        description: "Impossibile testare la connessione Kiwi.com",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const searchLocations = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearchingLocations(true);
    try {
      const response = await fetch(`/api/kiwi/locations?term=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      setLocations(result);
      
      toast({
        title: "Ricerca completata",
        description: `Trovate ${result.length} destinazioni`
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile cercare le destinazioni",
        variant: "destructive"
      });
    } finally {
      setIsSearchingLocations(false);
    }
  };

  const generateItinerary = async () => {
    setIsGeneratingItinerary(true);
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itineraryData),
      });

      if (!response.ok) {
        throw new Error('Errore nella generazione dell\'itinerario');
      }

      const result = await response.json();
      setGeneratedItinerary(result);
      
      toast({
        title: "Itinerario generato",
        description: "Il tuo itinerario personalizzato è pronto!"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare l'itinerario",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Test Integrazione Kiwi.com</h1>
        <p className="text-muted-foreground">
          Testa e utilizza l'API di Kiwi.com per la generazione di itinerari
        </p>
      </div>

      {/* Test Connessione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Test Connessione API
          </CardTitle>
          <CardDescription>
            Verifica se l'API di Kiwi.com è configurata correttamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testKiwiConnection} 
            disabled={isTestingConnection}
            className="w-full"
          >
            {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testa Connessione
          </Button>
          
          {testResult && (
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResult.connected ? "default" : "destructive"}>
                  {testResult.connected ? "Connesso" : "Disconnesso"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{testResult.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ricerca Destinazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ricerca Destinazioni
          </CardTitle>
          <CardDescription>
            Cerca destinazioni disponibili su Kiwi.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Inserisci nome città (es. Amsterdam, Roma, Praga)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchLocations()}
            />
            <Button 
              onClick={searchLocations} 
              disabled={isSearchingLocations || !searchTerm.trim()}
            >
              {isSearchingLocations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerca
            </Button>
          </div>
          
          {locations.length > 0 && (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {locations.map((location) => (
                <div key={location.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{location.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {location.country.name} ({location.code})
                      </p>
                    </div>
                    <Badge variant="outline">{location.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generazione Itinerario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Genera Itinerario
          </CardTitle>
          <CardDescription>
            Crea un itinerario personalizzato utilizzando i dati reali di Kiwi.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="destination">Destinazione</Label>
              <Input
                id="destination"
                placeholder="Es. Amsterdam"
                value={itineraryData.destination}
                onChange={(e) => setItineraryData({...itineraryData, destination: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="departureCity">Città di partenza</Label>
              <Input
                id="departureCity"
                placeholder="Es. Milano"
                value={itineraryData.departureCity}
                onChange={(e) => setItineraryData({...itineraryData, departureCity: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Data inizio</Label>
              <Input
                id="startDate"
                type="date"
                value={itineraryData.startDate}
                onChange={(e) => setItineraryData({...itineraryData, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data fine</Label>
              <Input
                id="endDate"
                type="date"
                value={itineraryData.endDate}
                onChange={(e) => setItineraryData({...itineraryData, endDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="groupSize">Numero partecipanti</Label>
              <Input
                id="groupSize"
                type="number"
                min="1"
                max="30"
                value={itineraryData.groupSize}
                onChange={(e) => setItineraryData({...itineraryData, groupSize: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget</Label>
              <select
                id="budget"
                className="w-full p-2 border rounded-md"
                value={itineraryData.budget}
                onChange={(e) => setItineraryData({...itineraryData, budget: e.target.value as any})}
              >
                <option value="budget">Budget</option>
                <option value="standard">Standard</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
          
          <Button 
            onClick={generateItinerary} 
            disabled={isGeneratingItinerary || !itineraryData.destination || !itineraryData.departureCity}
            className="w-full"
          >
            {isGeneratingItinerary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Genera Itinerario con Kiwi.com
          </Button>
        </CardContent>
      </Card>

      {/* Risultato Itinerario */}
      {generatedItinerary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Itinerario Generato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedItinerary.generatedPlan?.title}</h3>
                <p className="text-muted-foreground">{generatedItinerary.generatedPlan?.summary}</p>
              </div>
              
              {generatedItinerary.generatedPlan?.flights && (
                <div>
                  <h4 className="font-medium mb-2">Voli disponibili:</h4>
                  <div className="space-y-2">
                    {generatedItinerary.generatedPlan.flights.map((flight: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{flight.airline}</p>
                            <p className="text-sm text-muted-foreground">
                              {flight.departure} → {flight.arrival}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">€{flight.price}</p>
                            <p className="text-sm text-muted-foreground">{flight.duration}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <p className="text-lg font-semibold">
                  Costo totale stimato: €{generatedItinerary.generatedPlan?.estimatedTotalCost}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}