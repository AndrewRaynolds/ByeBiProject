import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plane, Hotel, Car, Music, Calendar, Users, MapPin, CheckCircle, CreditCard, Lock } from 'lucide-react';
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPaymentForm(false);
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
    setShowPaymentForm(false);
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvv('');
    
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      <Header />
      
      {/* Hero Header */}
      <div className="relative py-12 bg-gradient-to-r from-black/50 to-red-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
              Riepilogo Ordine
            </h1>
            <p className="text-white/80 text-lg">Conferma il tuo viaggio da sogno</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium">{checkoutData.destination}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Calendar className="w-5 h-5 text-red-400" />
              <span className="font-medium">{checkoutData.dates}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Users className="w-5 h-5 text-red-400" />
              <span className="font-medium">{checkoutData.people} persone</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">

        <div className="space-y-6">
          {groupedItems.flights.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-gray-600 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  Voli
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.flights.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b border-white/10 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-white/70">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400 text-lg">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-white/60">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.hotels.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-gray-600 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                    <Hotel className="w-5 h-5 text-white" />
                  </div>
                  Alloggi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.hotels.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b border-white/10 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-white/70">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400 text-lg">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-white/60">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.cars.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-gray-600 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  Noleggio Auto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.cars.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b border-white/10 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-white/70">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400 text-lg">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-white/60">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groupedItems.activities.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-gray-600 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  Attività & Esperienze
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.activities.map(item => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b border-white/10 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-white/70">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400 text-lg">€{item.price * checkoutData.people}</p>
                      <p className="text-xs text-white/60">€{item.price} x {checkoutData.people}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-red-500 shadow-2xl shadow-red-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-semibold text-white">Totale</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
                  €{checkoutData.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-300">
                <span>Prezzo per persona</span>
                <span className="font-semibold text-white">
                  €{Math.round(checkoutData.total / checkoutData.people)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            onClick={() => setLocation('/itinerary')}
            data-testid="button-back"
          >
            ← Torna all'Itinerario
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-xl shadow-red-500/30 transform transition-all hover:scale-105"
            onClick={handlePurchase}
            data-testid="button-purchase"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Compra Ora
          </Button>
        </div>
      </div>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {purchaseComplete ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Acquisto Completato!
                </>
              ) : showPaymentForm ? (
                <>
                  <Lock className="w-6 h-6 text-blue-600" />
                  Pagamento Sicuro
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
              ) : showPaymentForm ? (
                <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-800">Pagamento protetto da PayPal</p>
                    </div>
                    <p className="text-xs text-blue-700">I tuoi dati sono crittografati e sicuri</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Totale da pagare:</span>
                      <span className="text-2xl font-bold text-gray-900">€{checkoutData.total.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500">{checkoutData.destination} • {checkoutData.dates}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="card-number">Numero Carta</Label>
                      <Input
                        id="card-number"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={19}
                        required
                        className="mt-1"
                        data-testid="input-card-number"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="card-name">Nome sulla Carta</Label>
                      <Input
                        id="card-name"
                        type="text"
                        placeholder="Mario Rossi"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                        className="mt-1"
                        data-testid="input-card-name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="card-expiry">Scadenza</Label>
                        <Input
                          id="card-expiry"
                          type="text"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength={5}
                          required
                          className="mt-1"
                          data-testid="input-card-expiry"
                        />
                      </div>
                      <div>
                        <Label htmlFor="card-cvv">CVV</Label>
                        <Input
                          id="card-cvv"
                          type="text"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={3}
                          required
                          className="mt-1"
                          data-testid="input-card-cvv"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleClosePurchaseDialog}
                      data-testid="button-cancel-payment"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-submit-payment"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Paga €{checkoutData.total.toLocaleString()}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center pt-2">
                    Cliccando su "Paga", accetti i termini e le condizioni di PayPal
                  </p>
                </form>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                    <p className="text-gray-600">Stiamo processando il tuo pagamento...</p>
                    <p className="text-sm text-gray-500 mt-2">Connessione con PayPal sicuro</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                    <p className="font-semibold mb-2">Pagamento tramite PayPal:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Connessione sicura SSL</li>
                      <li>Dati protetti PCI-DSS</li>
                      <li>Garanzia rimborso PayPal</li>
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
