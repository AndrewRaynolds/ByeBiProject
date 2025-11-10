import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plane, Hotel, Car, Ship, Utensils, Music, Calendar, Users, MapPin } from 'lucide-react';
import Header from '@/components/Header';

interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'activity';
  name: string;
  description: string;
  price: number;
  details?: string[];
  image?: string;
}

const mockupData = {
  destination: 'Ibiza',
  dates: '2-5 Luglio 2025',
  people: 6,
  
  flights: [
    {
      id: 'flight-1',
      type: 'flight' as const,
      name: 'Ryanair - Milano → Ibiza',
      description: 'Volo diretto economico',
      price: 89,
      details: [
        'Partenza: 02 Luglio, 06:30',
        'Arrivo: 02 Luglio, 08:45',
        'Ritorno: 05 Luglio, 21:15',
        'Bagaglio a mano incluso'
      ]
    }
  ],
  
  hotels: [
    {
      id: 'hotel-1',
      type: 'hotel' as const,
      name: 'Ibiza Rocks Hotel',
      description: 'San Antonio - Party centrale',
      price: 180,
      details: [
        '3 notti (2-5 Luglio)',
        'Camera tripla x2',
        'Colazione inclusa',
        'Piscina e DJ set'
      ]
    },
    {
      id: 'hotel-2',
      type: 'hotel' as const,
      name: 'Playa d\'en Bossa Apartments',
      description: 'Playa d\'en Bossa - Vicino al mare',
      price: 150,
      details: [
        '3 notti (2-5 Luglio)',
        'Appartamento 6 posti',
        'Cucina attrezzata',
        'A 200m dalla spiaggia'
      ]
    },
    {
      id: 'hotel-3',
      type: 'hotel' as const,
      name: 'Budget Hostel Ibiza',
      description: 'Ibiza Town - Centro storico',
      price: 95,
      details: [
        '3 notti (2-5 Luglio)',
        'Camera condivisa 6 posti',
        'Cucina comune',
        'Terrazza panoramica'
      ]
    }
  ],
  
  cars: [
    {
      id: 'car-1',
      type: 'car' as const,
      name: 'Fiat Panda o simile',
      description: 'Auto economica 5 posti',
      price: 120,
      details: [
        '3 giorni (2-5 Luglio)',
        'Assicurazione base inclusa',
        'Chilometraggio illimitato',
        'Ritiro aeroporto'
      ]
    }
  ],
  
  activities: [
    {
      id: 'activity-1',
      type: 'activity' as const,
      name: 'Boat Party con DJ',
      description: 'Festa in barca con open bar',
      price: 65,
      details: [
        '5 ore di party',
        'Open bar premium',
        'DJ internazionale',
        'Nuoto e snorkeling'
      ]
    },
    {
      id: 'activity-2',
      type: 'activity' as const,
      name: 'Beach Club - Blue Marlin',
      description: 'Day pass con lettini',
      price: 45,
      details: [
        'Lettini riservati',
        'Accesso piscina',
        'DJ set pomeridiano',
        '1 drink incluso'
      ]
    },
    {
      id: 'activity-3',
      type: 'activity' as const,
      name: 'Cena di Gruppo - Es Boldadó',
      description: 'Ristorante vista tramonto',
      price: 50,
      details: [
        'Menu degustazione',
        'Vista panoramica',
        'Vino della casa',
        'Prenotazione garantita'
      ]
    }
  ]
};

export default function Itinerary() {
  const [, setLocation] = useLocation();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['flight-1']));
  
  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      if (itemId !== 'flight-1') {
        newSelected.delete(itemId);
      }
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };
  
  const calculateTotal = () => {
    const allItems = [
      ...mockupData.flights,
      ...mockupData.hotels,
      ...mockupData.cars,
      ...mockupData.activities
    ];
    
    return allItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + (item.price * mockupData.people), 0);
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'hotel': return <Hotel className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      case 'activity': return <Music className="w-5 h-5" />;
      default: return null;
    }
  };
  
  const renderItemCard = (item: BookingItem, isSelected: boolean, isRequired = false) => (
    <Card 
      key={item.id} 
      className={`transition-all duration-300 backdrop-blur-sm border-2 transform hover:scale-[1.02] ${
        isSelected 
          ? 'border-red-500 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/20' 
          : 'border-gray-600 bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:border-red-400 hover:shadow-xl'
      } ${isRequired ? 'opacity-100' : ''}`}
      data-testid={`card-${item.type}-${item.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-3 rounded-xl transition-all ${
              isSelected 
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg' 
                : 'bg-gradient-to-br from-gray-700 to-gray-800 text-red-400'
            }`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg text-white font-bold">{item.name}</CardTitle>
              <p className="text-sm text-gray-300 mt-1">{item.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-2xl font-bold ${isSelected ? 'text-red-400' : 'text-white'}`}>
                €{item.price}
              </p>
              <p className="text-xs text-gray-400">a persona</p>
            </div>
            <Switch
              checked={isSelected}
              onCheckedChange={() => toggleItem(item.id)}
              disabled={isRequired}
              data-testid={`toggle-${item.id}`}
              className="data-[state=checked]:bg-red-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {item.details?.map((detail, idx) => (
            <li key={idx} className="text-sm text-gray-200 flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
  
  const handleCheckout = () => {
    const selected = [
      ...mockupData.flights,
      ...mockupData.hotels,
      ...mockupData.cars,
      ...mockupData.activities
    ].filter(item => selectedItems.has(item.id));
    
    localStorage.setItem('checkoutItems', JSON.stringify({
      items: selected,
      people: mockupData.people,
      destination: mockupData.destination,
      dates: mockupData.dates,
      total: calculateTotal()
    }));
    
    setLocation('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      <Header />
      
      {/* Hero Header */}
      <div className="relative py-12 bg-gradient-to-r from-black/50 to-red-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
              Il Tuo Viaggio a {mockupData.destination}
            </h1>
            <p className="text-white/80 text-lg">Personalizza il tuo pacchetto perfetto</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Calendar className="w-5 h-5 text-red-400" />
              <span className="font-medium">{mockupData.dates}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Users className="w-5 h-5 text-red-400" />
              <span className="font-medium">{mockupData.people} persone</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium">Isole Baleari, Spagna</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">

        <div className="space-y-8">
          <section>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Plane className="w-6 h-6 text-white" />
              </div>
              Volo
            </h2>
            <div className="grid gap-4">
              {mockupData.flights.map(flight => 
                renderItemCard(flight, selectedItems.has(flight.id), true)
              )}
            </div>
            <p className="text-sm text-white/60 mt-2 ml-1 bg-white/5 inline-block px-3 py-1 rounded-full">
              ✈️ Il volo è obbligatorio per questo viaggio
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Hotel className="w-6 h-6 text-white" />
              </div>
              Hotel & Alloggi
            </h2>
            <div className="grid gap-4">
              {mockupData.hotels.map(hotel => 
                renderItemCard(hotel, selectedItems.has(hotel.id))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Car className="w-6 h-6 text-white" />
              </div>
              Noleggio Auto
            </h2>
            <div className="grid gap-4">
              {mockupData.cars.map(car => 
                renderItemCard(car, selectedItems.has(car.id))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Ship className="w-6 h-6 text-white" />
              </div>
              Attività & Esperienze
            </h2>
            <div className="grid gap-4">
              {mockupData.activities.map(activity => 
                renderItemCard(activity, selectedItems.has(activity.id))
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-black/90 via-red-900/90 to-black/90 backdrop-blur-md border-t-2 border-red-500/50 shadow-2xl mt-12 p-6 rounded-t-3xl">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-white/70 mb-1">Totale per {mockupData.people} persone</p>
              <p className="text-5xl font-bold bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">
                €{calculateTotal().toLocaleString()}
              </p>
              <p className="text-sm text-white/60 mt-1">
                €{Math.round(calculateTotal() / mockupData.people)} a persona
              </p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-10 py-7 text-lg font-bold shadow-xl shadow-red-500/30 transform transition-all hover:scale-105"
              onClick={handleCheckout}
              data-testid="button-checkout"
            >
              Vai al Checkout →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
