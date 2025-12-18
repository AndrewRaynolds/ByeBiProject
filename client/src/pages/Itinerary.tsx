import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Calendar, Users, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import { formatDateRangeIT } from '@shared/dateUtils';

/**
 * TripContext - The ONLY data structure used by the real flow
 * Populated by chatbot, read by Itinerary and Checkout
 */
interface TripContext {
  origin: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  people: number;
  aviasalesCheckoutUrl: string;
  flightLabel?: string;
}

export default function Itinerary() {
  const [, setLocation] = useLocation();
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read TripContext from localStorage - NO fallback mock data
    const savedItinerary = localStorage.getItem('currentItinerary');
    
    if (!savedItinerary) {
      setError('Nessun itinerario trovato. Torna al chatbot per creare il tuo viaggio.');
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedItinerary);
      console.log('📦 Loaded TripContext from localStorage:', parsed);

      // Validate required fields
      if (!parsed.destination || !parsed.startDate || !parsed.endDate || !parsed.people) {
        setError('Dati del viaggio incompleti. Torna al chatbot per completare la pianificazione.');
        setIsLoading(false);
        return;
      }

      // Build TripContext from saved data
      const context: TripContext = {
        origin: parsed.origin || parsed.originCity || '',
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        people: parsed.people,
        aviasalesCheckoutUrl: parsed.aviasalesCheckoutUrl || parsed.aviasalesUrl || '',
        flightLabel: parsed.flightLabel || parsed.selectedFlight?.label || `${parsed.origin || 'Italia'} → ${parsed.destination}`
      };

      setTripContext(context);
    } catch (err) {
      console.error('Error parsing TripContext:', err);
      setError('Errore nel caricamento dei dati. Torna al chatbot per riprovare.');
    }
    
    setIsLoading(false);
  }, []);

  const handleContinue = () => {
    // TripContext already in localStorage, just navigate
    setLocation('/checkout');
  };

  const handleBackToChatbot = () => {
    setLocation('/');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  // Error state - no TripContext or invalid data
  if (error || !tripContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
        <Header />
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-red-500/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-red-500/20 rounded-full w-fit">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-white">Nessun Itinerario</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-6">
                {error || 'Devi prima pianificare il tuo viaggio con il chatbot.'}
              </p>
              <Button
                onClick={handleBackToChatbot}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 text-lg"
                data-testid="button-back-chatbot"
              >
                Torna al Chatbot
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Format dates using safe string-based formatter
  const formattedDates = formatDateRangeIT(tripContext.startDate, tripContext.endDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      <Header />
      
      {/* Hero Header */}
      <div className="relative py-12 bg-gradient-to-r from-black/50 to-red-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
              Il Tuo Viaggio a {tripContext.destination}
            </h1>
            <p className="text-white/80 text-lg">Conferma i dettagli e continua al checkout</p>
          </div>
          
          {/* Trip Info Pills */}
          <div className="flex flex-wrap justify-center gap-4 text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Calendar className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-dates">{formattedDates}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Users className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-people">{tripContext.people} persone</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-destination">{tripContext.destination}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          
          {/* Flight Section - No prices, only Aviasales link */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Plane className="w-6 h-6 text-white" />
              </div>
              Volo
            </h2>
            
            <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-2 border-gray-600 hover:border-red-400 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                      <Plane className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white font-bold" data-testid="text-flight-label">
                        {tripContext.flightLabel || `${tripContext.origin} → ${tripContext.destination}`}
                      </CardTitle>
                      <p className="text-sm text-gray-300 mt-1">
                        {formattedDates} • {tripContext.people} passeggeri
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-4">
                  Prenota il volo direttamente su Aviasales per le migliori tariffe disponibili.
                </p>
                
                {tripContext.aviasalesCheckoutUrl && (
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    data-testid="button-aviasales"
                  >
                    <a 
                      href={tripContext.aviasalesCheckoutUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Plane className="w-4 h-4 mr-2" />
                      Vai su Aviasales
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
            
            <p className="text-sm text-white/60 mt-2 ml-1 bg-white/5 inline-block px-3 py-1 rounded-full">
              ✈️ Prenota il volo esternamente, poi continua per hotel
            </p>
          </section>

        </div>

        {/* Bottom CTA - Continua */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-black/90 via-red-900/90 to-black/90 backdrop-blur-md border-t-2 border-red-500/50 shadow-2xl mt-12 p-6 rounded-t-3xl">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-white/70 text-sm">Prossimo passo</p>
              <p className="text-xl text-white font-bold">Scegli il tuo hotel</p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-10 py-7 text-lg font-bold shadow-xl shadow-red-500/30 transform transition-all hover:scale-105"
              onClick={handleContinue}
              data-testid="button-continue"
            >
              Continua al Checkout →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
