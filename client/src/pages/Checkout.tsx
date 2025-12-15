import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Calendar, Users, MapPin, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

interface FlightData {
  flightIndex: number;
  airline: string;
  price: number;
  departure_at: string;
  return_at: string;
  flight_number: number;
  originCity: string;
  destinationCity: string;
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

interface ItineraryData {
  destination: string;
  dates: string;
  people: number;
  startDate: string;
  endDate: string;
  days: number;
  partyType: string;
  originCity: string;
  selectedFlight: FlightData | null;
}

const CITY_TO_IATA: Record<string, string> = {
  'roma': 'ROM', 'ibiza': 'IBZ', 'barcellona': 'BCN', 'praga': 'PRG',
  'budapest': 'BUD', 'cracovia': 'KRK', 'amsterdam': 'AMS', 'berlino': 'BER',
  'lisbona': 'LIS', 'palma de mallorca': 'PMI', 'milano': 'MIL', 'napoli': 'NAP',
  'torino': 'TRN', 'venezia': 'VCE', 'bologna': 'BLQ', 'firenze': 'FLR'
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelData | null>(null);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelError, setHotelError] = useState<string | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('currentItinerary');
    if (data) {
      const parsed = JSON.parse(data) as ItineraryData;
      setItinerary(parsed);
      
      if (parsed.destination && parsed.startDate && parsed.endDate && parsed.people) {
        fetchHotels(parsed);
      }
    } else {
      setLocation('/');
    }
  }, []);

  const fetchHotels = async (data: ItineraryData) => {
    setLoadingHotels(true);
    setHotelError(null);
    
    try {
      const cityCode = CITY_TO_IATA[data.destination.toLowerCase()] || data.destination.substring(0, 3).toUpperCase();
      
      const params = new URLSearchParams({
        cityCode,
        checkInDate: data.startDate,
        checkOutDate: data.endDate,
        adults: String(data.people),
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

  const getFlightCheckoutUrl = (): string => {
    if (!itinerary?.selectedFlight || !itinerary.originCity || !itinerary.destination) {
      return '#';
    }
    
    const originIata = CITY_TO_IATA[itinerary.originCity.toLowerCase()] || 'ROM';
    const destIata = CITY_TO_IATA[itinerary.destination.toLowerCase()] || 'BCN';
    
    const depDate = itinerary.selectedFlight.departure_at.slice(0, 10);
    const retDate = itinerary.selectedFlight.return_at.slice(0, 10);
    const depDay = depDate.slice(8, 10);
    const depMonth = depDate.slice(5, 7);
    const retDay = retDate.slice(8, 10);
    const retMonth = retDate.slice(5, 7);
    
    return `https://www.aviasales.com/search/${originIata}${depDay}${depMonth}${destIata}${retDay}${retMonth}${itinerary.people}?marker=byebi`;
  };

  const getHotelBookingUrl = (hotel: HotelData): string => {
    const hotelName = encodeURIComponent(hotel.name);
    const city = encodeURIComponent(itinerary?.destination || '');
    return `https://www.booking.com/searchresults.html?ss=${hotelName}+${city}&checkin=${hotel.checkInDate}&checkout=${hotel.checkOutDate}&group_adults=${itinerary?.people || 2}`;
  };

  if (!itinerary) {
    return null;
  }

  const flightTotal = itinerary.selectedFlight ? itinerary.selectedFlight.price * itinerary.people : 0;
  const hotelTotal = selectedHotel ? selectedHotel.priceTotal : 0;
  const grandTotal = flightTotal + hotelTotal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      <Header />
      
      <div className="relative py-12 bg-gradient-to-r from-black/50 to-red-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
              Prenota il tuo Viaggio
            </h1>
            <p className="text-white/80 text-lg">Seleziona l'hotel e completa la prenotazione</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium">{itinerary.destination}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Calendar className="w-5 h-5 text-red-400" />
              <span className="font-medium">{itinerary.dates}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Users className="w-5 h-5 text-red-400" />
              <span className="font-medium">{itinerary.people} persone</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        
        {itinerary.selectedFlight && (
          <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-green-500 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white text-xl">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                Volo Selezionato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start pb-4">
                <div className="flex-1">
                  <p className="font-semibold text-white text-lg">
                    {itinerary.selectedFlight.airline} - {itinerary.originCity} → {itinerary.destination}
                  </p>
                  <p className="text-sm text-white/70 mt-1">
                    Partenza: {new Date(itinerary.selectedFlight.departure_at).toLocaleString('it-IT')}
                  </p>
                  <p className="text-sm text-white/70">
                    Ritorno: {new Date(itinerary.selectedFlight.return_at).toLocaleString('it-IT')}
                  </p>
                  <p className="text-sm text-white/70">Volo n. {itinerary.selectedFlight.flight_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400 text-2xl">€{flightTotal}</p>
                  <p className="text-xs text-white/60">€{itinerary.selectedFlight.price} x {itinerary.people} persone</p>
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                onClick={() => window.open(getFlightCheckoutUrl(), '_blank')}
                data-testid="button-book-flight"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Prenota Volo su Aviasales
              </Button>
            </CardContent>
          </Card>
        )}

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

        <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-red-500 shadow-2xl shadow-red-500/20">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-white/80">
                <span>Volo ({itinerary.people} persone)</span>
                <span className="font-semibold text-white">€{flightTotal}</span>
              </div>
              {selectedHotel && (
                <div className="flex justify-between items-center text-white/80">
                  <span>Hotel ({itinerary.days} notti)</span>
                  <span className="font-semibold text-white">€{hotelTotal}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-white">Totale Stimato</span>
                  <span className="text-4xl font-bold bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
                    €{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-white/50 text-xs mt-4">
              I prezzi sono indicativi. Completa le prenotazioni sui siti partner per confermare.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            ← Torna alla Home
          </Button>
        </div>
      </div>
    </div>
  );
}
