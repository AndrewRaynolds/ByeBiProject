import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plane, Hotel, Car, Music, Calendar, Users, MapPin, CheckCircle, CreditCard } from 'lucide-react';
import Header from '@/components/Header';

interface CheckoutData {
  items: Array<{
    id: string;
    type: 'flight' | 'hotel' | 'car' | 'activity';
    name: string;
    description: string;
    price: number;
    details?: string[];
  }>;
  people: number;
  destination: string;
  dates: string;
  total: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('checkoutItems');
    if (data) {
      setCheckoutData(JSON.parse(data));
    } else {
      setLocation('/');
    }
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'hotel': return <Hotel className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      case 'activity': return <Music className="w-5 h-5" />;
      default: return null;
    }
  };

  const handlePurchase = () => {
    setShowPurchaseDialog(true);
    setIsPurchasing(true);
    
    setTimeout(() => {
      setIsPurchasing(false);
      setPurchaseComplete(true);
    }, 2000);
  };

  const handleClosePurchaseDialog = () => {
    setShowPurchaseDialog(false);
    setPurchaseComplete(false);
    setIsPurchasing(false);
    
    if (purchaseComplete) {
      localStorage.removeItem('checkoutItems');
      setLocation('/');
    }
  };

  if (!checkoutData) {
    return null;
  }

  const groupedItems = {
    flights: checkoutData.items.filter(item => item.type === 'flight'),
    hotels: checkoutData.items.filter(item => item.type === 'hotel'),
    cars: checkoutData.items.filter(item => item.type === 'car'),
    activities: checkoutData.items.filter(item => item.type === 'activity'),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Riepilogo Ordine</h1>
          <div className="flex flex-wrap gap-4 text-gray-600 mt-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              <span className="font-medium">{checkoutData.destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600" />
              <span className="font-medium">{checkoutData.dates}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <span className="font-medium">{checkoutData.people} persone</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {groupedItems.flights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-red-600" />
                  Voli
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.flights.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-gray-500">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.hotels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-red-600" />
                  Alloggi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.hotels.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-gray-500">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.cars.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-red-600" />
                  Noleggio Auto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.cars.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-gray-500">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.activities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-red-600" />
                  Attività & Esperienze
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.activities.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-gray-500">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Totale</span>
                <span className="text-3xl font-bold text-red-600">
                  €{checkoutData.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Prezzo per persona</span>
                <span className="font-semibold">
                  €{Math.round(checkoutData.total / checkoutData.people)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setLocation('/itinerary')}
            data-testid="button-back"
          >
            ← Torna all'Itinerario
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePurchase}
            data-testid="button-purchase"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Compra Ora
          </Button>
        </div>
      </div>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {purchaseComplete ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Acquisto Completato!
                </>
              ) : (
                <>
                  <CreditCard className="w-6 h-6 text-red-600" />
                  Elaborazione Pagamento
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {purchaseComplete ? (
                <div className="space-y-4 pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold mb-2">
                      Il tuo viaggio a {checkoutData.destination} è confermato!
                    </p>
                    <p className="text-sm text-green-700">
                      Riceverai una email di conferma con tutti i dettagli della prenotazione.
                    </p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Riepilogo:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Destinazione:</span>
                        <span className="font-semibold">{checkoutData.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-semibold">{checkoutData.dates}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Persone:</span>
                        <span className="font-semibold">{checkoutData.people}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600 font-semibold">Totale:</span>
                        <span className="font-bold text-red-600">€{checkoutData.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={handleClosePurchaseDialog}
                    data-testid="button-close-success"
                  >
                    Torna alla Home
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                    <p className="text-gray-600">Stiamo processando il tuo pagamento...</p>
                    <p className="text-sm text-gray-500 mt-2">Connessione con partner di pagamento sicuro</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                    <p className="font-semibold mb-2">Pagamento tramite partner:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Connessione sicura SSL</li>
                      <li>Dati protetti PCI-DSS</li>
                      <li>Garanzia rimborso</li>
                    </ul>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
