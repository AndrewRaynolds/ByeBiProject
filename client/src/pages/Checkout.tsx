import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Calendar, Users, MapPin, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import { formatDateRangeIT, calculateTripDays } from '@shared/dateUtils';

/**
 * TripContext - The ONLY data structure used by the real flow
 * Must match Itinerary.tsx's TripContext
 */
interface TripContext {
  origin: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  people: number;
  aviasalesCheckoutUrl: string;
  flightLabel?: string;
  originCity?: string; // Legacy compatibility
}

interface HotelData {
  hotelId: string;
  name: string;
  stars?: string;
  priceTotal: number;
  currency: string;
  offerId: string;
  bookingFlow: 'IN_APP' | 'REDIRECT';
  paymentPolicy: string;
  checkInDate: string;
  checkOutDate: string;
  roomDescription?: string;
}

const CITY_TO_IATA: Record<string, string> = {
  'roma': 'ROM', 'ibiza': 'IBZ', 'barcellona': 'BCN', 'praga': 'PRG',
  'budapest': 'BUD', 'cracovia': 'KRK', 'amsterdam': 'AMS', 'berlino': 'BER',
  'lisbona': 'LIS', 'palma de mallorca': 'PMI', 'milano': 'MIL', 'napoli': 'NAP',
  'torino': 'TRN', 'venezia': 'VCE', 'bologna': 'BLQ', 'firenze': 'FLR'
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelData | null>(null);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = localStorage.getItem('currentItinerary');
    
    if (!data) {
      setLocation('/');
      return;
    }
    
    try {
      const parsed = JSON.parse(data);
      
      // Build TripContext from saved data
      const context: TripContext = {
        origin: parsed.origin || parsed.originCity || '',
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        people: parsed.people,
        aviasalesCheckoutUrl: parsed.aviasalesCheckoutUrl || parsed.aviasalesUrl || '',
        flightLabel: parsed.flightLabel || parsed.selectedFlight?.label || `${parsed.origin || parsed.originCity || 'Italia'} → ${parsed.destination}`,
        originCity: parsed.originCity
      };
      
      setTripContext(context);
      
      if (context.destination && context.startDate && context.endDate && context.people) {
        fetchHotels(context);
      }
    } catch (err) {
      console.error('Error parsing TripContext:', err);
      setLocation('/');
    }
    
    setIsLoading(false);
  }, []);

  const fetchHotels = async (context: TripContext) => {
    setLoadingHotels(true);
    setHotelError(null);
    
    try {
      const cityCode = CITY_TO_IATA[context.destination.toLowerCase()] || context.destination.substring(0, 3).toUpperCase();
      
      const params = new URLSearchParams({
        cityCode,
        checkInDate: context.startDate,
        checkOutDate: context.endDate,
        adults: String(context.people),
        currency: 'EUR'
      });
      
      const response = await fetch(`/api/hotels/search?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Errore nella ricerca hotel');
      }
      
      if (result.hotels && result.hotels.length > 0) {
        setHotels(result.hotels.slice(0, 5));
      } else {
        setHotelError('Nessun hotel disponibile per le date selezionate. Prova a modificare le date del viaggio.');
      }
    } catch (error: any) {
      console.error('Hotel fetch error:', error);
      setHotelError(`Impossibile caricare gli hotel: ${error.message}. Le API potrebbero essere temporaneamente non disponibili.`);
    } finally {
      setLoadingHotels(false);
    }
  };

  const getHotelBookingUrl = (hotel: HotelData): string => {
    const hotelName = encodeURIComponent(hotel.name);
    const city = encodeURIComponent(tripContext?.destination || '');
    return `https://www.booking.com/searchresults.html?ss=${hotelName}+${city}&checkin=${hotel.checkInDate}&checkout=${hotel.checkOutDate}&group_adults=${tripContext?.people || 2}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  // Validate required TripContext fields
  if (!tripContext || !tripContext.destination || !tripContext.startDate || !tripContext.endDate || !tripContext.people) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
        <Header />
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-red-500/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-red-500/20 rounded-full w-fit">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-white">Dati Viaggio Mancanti</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-6">
                I dati del viaggio sono incompleti. Torna al chatbot per completare la pianificazione.
              </p>
              <Button
                onClick={() => setLocation('/')}
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

  // Calculate trip days from dates (safe - fields validated above)
  const tripDays = calculateTripDays(tripContext.startDate, tripContext.endDate);
  const formattedDates = formatDateRangeIT(tripContext.startDate, tripContext.endDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      <Header />
      
      {/* Hero Header */}
      <div className="relative py-12 bg-gradient-to-r from-black/50 to-red-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
              Prenota il tuo Viaggio
            </h1>
            <p className="text-white/80 text-lg">Seleziona l'hotel e completa la prenotazione</p>
          </div>
          
          {/* Trip Info Pills */}
          <div className="flex flex-wrap justify-center gap-4 text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-destination">{tripContext.destination}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Calendar className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-dates">{formattedDates}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Users className="w-5 h-5 text-red-400" />
              <span className="font-medium" data-testid="text-people">{tripContext.people} persone</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        
        {/* Flight Section - Uses aviasalesCheckoutUrl directly */}
        <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-green-500 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white text-xl">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                <Plane className="w-5 h-5 text-white" />
              </div>
              Volo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="pb-4">
              <p className="font-semibold text-white text-lg" data-testid="text-flight-label">
                {tripContext.flightLabel}
              </p>
              <p className="text-sm text-white/70 mt-1">
                {formattedDates} • {tripContext.people} passeggeri
              </p>
            </div>
            <p className="text-xs text-white/50 mb-3 italic">
              Prenota il volo direttamente su Aviasales per le migliori tariffe
            </p>
            
            {tripContext.aviasalesCheckoutUrl ? (
              <Button 
                asChild
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                data-testid="button-book-flight"
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
            ) : (
              <p className="text-yellow-400 text-sm">Link volo non disponibile. Torna al chatbot per selezionare un volo.</p>
            )}
          </CardContent>
        </Card>

        {/* Hotel Selection */}
        <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-gray-600 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white text-xl">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Hotel className="w-5 h-5 text-white" />
              </div>
              Seleziona Hotel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHotels ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-red-400 mb-4" />
                <p className="text-white/70">Caricamento hotel disponibili...</p>
              </div>
            ) : hotelError ? (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-200 font-medium">Hotel non disponibili</p>
                    <p className="text-yellow-200/70 text-sm mt-1">{hotelError}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {hotels.map((hotel, index) => (
                  <div 
                    key={hotel.hotelId}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedHotel?.hotelId === hotel.hotelId
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-white/20 bg-white/5 hover:border-red-400'
                    }`}
                    onClick={() => setSelectedHotel(hotel)}
                    data-testid={`hotel-option-${index + 1}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{hotel.name}</p>
                          {hotel.stars && (
                            <span className="text-yellow-400 text-sm">{'⭐'.repeat(parseInt(hotel.stars))}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/70 mt-1">{hotel.roomDescription || 'Camera standard'}</p>
                        <p className="text-xs text-white/50 mt-1">
                          {hotel.checkInDate} → {hotel.checkOutDate} | {hotel.paymentPolicy}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400 text-xl">€{hotel.priceTotal}</p>
                        <p className="text-xs text-white/60">totale soggiorno</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedHotel && (
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                onClick={() => window.open(getHotelBookingUrl(selectedHotel), '_blank')}
                data-testid="button-book-hotel"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Prenota Hotel su Booking.com
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Hotel Summary */}
        {selectedHotel && (
          <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-red-500 shadow-2xl shadow-red-500/20">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-white/80">
                  <span>Hotel ({tripDays} notti)</span>
                  <span className="font-semibold text-white">€{selectedHotel.priceTotal}</span>
                </div>
              </div>
              <p className="text-center text-white/50 text-xs mt-4">
                I prezzi hotel sono indicativi. Conferma sul sito partner.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            onClick={() => setLocation('/itinerary')}
            data-testid="button-back-itinerary"
          >
            ← Torna all'Itinerario
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            onClick={() => setLocation('/')}
            data-testid="button-back-home"
          >
            🏠 Torna alla Home
          </Button>
        </div>
      </div>
    </div>
  );
}
