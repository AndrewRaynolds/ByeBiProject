import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, Loader2, Plane, Hotel, Search } from 'lucide-react';

interface APIStatus {
  kiwi: boolean;
  booking: boolean;
}

export default function ApiTestPage() {
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [flightSearch, setFlightSearch] = useState({
    from: 'MXP',
    to: 'AMS',
    dateFrom: '2024-07-15',
    dateTo: '2024-07-20',
    adults: 2
  });
  const [hotelSearch, setHotelSearch] = useState({
    destination: 'Amsterdam',
    checkIn: '2024-07-15',
    checkOut: '2024-07-20',
    adults: 2
  });
  const [flightResults, setFlightResults] = useState<any[]>([]);
  const [hotelResults, setHotelResults] = useState<any>({});
  const [searchLoading, setSearchLoading] = useState<string | null>(null);

  const testAPIs = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/travel/test-apis');
      const data = await response.json();
      setApiStatus(data.apis);
    } catch (error) {
      console.error('Error testing APIs:', error);
      setApiStatus({ kiwi: false, booking: false });
    }
    setLoading(false);
  };

  const searchFlights = async () => {
    setSearchLoading('flights');
    try {
      const params = new URLSearchParams({
        from: flightSearch.from,
        to: flightSearch.to,
        dateFrom: flightSearch.dateFrom,
        dateTo: flightSearch.dateTo,
        adults: flightSearch.adults.toString()
      });
      
      const response = await apiRequest('GET', `/api/travel/flights/search?${params}`);
      const data = await response.json();
      setFlightResults(data);
    } catch (error) {
      console.error('Error searching flights:', error);
      setFlightResults([]);
    }
    setSearchLoading(null);
  };

  const searchHotels = async () => {
    setSearchLoading('hotels');
    try {
      const params = new URLSearchParams({
        destination: hotelSearch.destination,
        checkIn: hotelSearch.checkIn,
        checkOut: hotelSearch.checkOut,
        adults: hotelSearch.adults.toString()
      });
      
      const response = await apiRequest('GET', `/api/travel/hotels/search?${params}`);
      const data = await response.json();
      setHotelResults(data);
    } catch (error) {
      console.error('Error searching hotels:', error);
      setHotelResults({});
    }
    setSearchLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Test API Reali</h1>
            <p className="text-lg text-gray-300">
              Verifica le connessioni a Kiwi.com e Booking.com per la generazione di itinerari autentici
            </p>
          </div>

          {/* API Status */}
          <Card className="bg-slate-800 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Stato delle API
              </CardTitle>
              <CardDescription className="text-gray-300">
                Controlla se le API keys sono configurate correttamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testAPIs} 
                disabled={loading}
                className="mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connessioni API'
                )}
              </Button>

              {apiStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Plane className="w-5 h-5" />
                      <span>Kiwi.com API</span>
                    </div>
                    <Badge variant={apiStatus.kiwi ? "default" : "destructive"}>
                      {apiStatus.kiwi ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1" />
                      )}
                      {apiStatus.kiwi ? 'Connected' : 'Failed'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Hotel className="w-5 h-5" />
                      <span>Booking.com API</span>
                    </div>
                    <Badge variant={apiStatus.booking ? "default" : "destructive"}>
                      {apiStatus.booking ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1" />
                      )}
                      {apiStatus.booking ? 'Connected' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Flight Search */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  Test Ricerca Voli
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Cerca voli reali usando Kiwi.com API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from">Da (Codice Aeroporto)</Label>
                    <Input
                      id="from"
                      value={flightSearch.from}
                      onChange={(e) => setFlightSearch({...flightSearch, from: e.target.value})}
                      placeholder="MXP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="to">A (Codice Aeroporto)</Label>
                    <Input
                      id="to"
                      value={flightSearch.to}
                      onChange={(e) => setFlightSearch({...flightSearch, to: e.target.value})}
                      placeholder="AMS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">Data Partenza</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={flightSearch.dateFrom}
                      onChange={(e) => setFlightSearch({...flightSearch, dateFrom: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Data Ritorno</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={flightSearch.dateTo}
                      onChange={(e) => setFlightSearch({...flightSearch, dateTo: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adults">Adulti</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    max="9"
                    value={flightSearch.adults}
                    onChange={(e) => setFlightSearch({...flightSearch, adults: parseInt(e.target.value)})}
                  />
                </div>

                <Button 
                  onClick={searchFlights} 
                  disabled={searchLoading === 'flights'}
                  className="w-full"
                >
                  {searchLoading === 'flights' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cercando...
                    </>
                  ) : (
                    'Cerca Voli'
                  )}
                </Button>

                {flightResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Risultati ({flightResults.length} voli trovati):</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {flightResults.slice(0, 3).map((flight, index) => (
                        <div key={index} className="p-3 bg-slate-700 rounded text-sm">
                          <div className="flex justify-between items-center">
                            <span>{flight.cityFrom} → {flight.cityTo}</span>
                            <Badge variant="secondary">€{flight.price}</Badge>
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {flight.airlines?.join(', ') || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hotel Search */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  Test Ricerca Hotel
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Cerca hotel reali usando Booking.com API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="destination">Destinazione</Label>
                  <Input
                    id="destination"
                    value={hotelSearch.destination}
                    onChange={(e) => setHotelSearch({...hotelSearch, destination: e.target.value})}
                    placeholder="Amsterdam"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={hotelSearch.checkIn}
                      onChange={(e) => setHotelSearch({...hotelSearch, checkIn: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={hotelSearch.checkOut}
                      onChange={(e) => setHotelSearch({...hotelSearch, checkOut: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="hotelAdults">Adulti</Label>
                  <Input
                    id="hotelAdults"
                    type="number"
                    min="1"
                    max="9"
                    value={hotelSearch.adults}
                    onChange={(e) => setHotelSearch({...hotelSearch, adults: parseInt(e.target.value)})}
                  />
                </div>

                <Button 
                  onClick={searchHotels} 
                  disabled={searchLoading === 'hotels'}
                  className="w-full"
                >
                  {searchLoading === 'hotels' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cercando...
                    </>
                  ) : (
                    'Cerca Hotel'
                  )}
                </Button>

                {hotelResults.hotels && hotelResults.hotels.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Risultati ({hotelResults.hotels.length} hotel trovati):</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {hotelResults.hotels.slice(0, 3).map((hotel: any, index: number) => (
                        <div key={index} className="p-3 bg-slate-700 rounded text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{hotel.hotel_name}</span>
                            <Badge variant="secondary">€{hotel.min_total_price}</Badge>
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {hotel.review_score && (
                              <span>{hotel.review_score}/10 • </span>
                            )}
                            {hotel.city}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator className="my-8" />

          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Note Tecniche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="p-4 bg-slate-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Kiwi.com API</h4>
                <p>
                  Utilizza l'API Tequila di Kiwi.com per cercare voli reali. 
                  Supporta ricerche per codici aeroporto (es. MXP, AMS) e fornisce 
                  dati autentici su prezzi, compagnie aeree e orari.
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Booking.com API</h4>
                <p>
                  Integra l'API RapidAPI di Booking.com per cercare hotel reali.
                  Fornisce informazioni dettagliate su prezzi, recensioni, 
                  servizi e disponibilità per le date selezionate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}