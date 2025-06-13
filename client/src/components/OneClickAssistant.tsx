import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Calendar, MapPin, Utensils, Music, Plane, Building, Car, Gift, PlusCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { travelService, Flight, Hotel, Activity, Restaurant, Event, PackageRequest, TravelPackage } from '@/services/travel-service';

// City information database for bachelor parties
const CITY_DATA = {
  roma: {
    name: "Roma",
    restaurants: [
      { name: "Da Enzo al 29", type: "Traditional Roman", zone: "Monti" },
      { name: "Checchino dal 1887", type: "Historic Roman", zone: "Testaccio" },
      { name: "Armando al Pantheon", type: "Classic Italian", zone: "Centro Storico" },
      { name: "Il Sorpasso", type: "Modern Italian", zone: "Prati" }
    ],
    nightlife: [
      { name: "Salotto 42", type: "Cocktail Bar", zone: "Centro" },
      { name: "Akab", type: "Electronic Club", zone: "Testaccio" },
      { name: "Goa Club", type: "Multi-genre Club", zone: "Ostiense" },
      { name: "Jerry Thomas Project", type: "Speakeasy", zone: "Vicolo Cellini" }
    ],
    activities: [
      "Colosseum VIP Underground Tour",
      "Roman Food Tour in Trastevere",
      "Vespa Tour of Rome",
      "Gladiator School Experience",
      "Vatican Skip-the-Line Tour"
    ],
    accommodation: [
      { zone: "Centro Storico", type: "Luxury hotels near major attractions" },
      { zone: "Trastevere", type: "Boutique hotels with nightlife access" },
      { zone: "Testaccio", type: "Modern apartments near clubs" }
    ]
  },
  milano: {
    name: "Milano",
    restaurants: [
      { name: "Osteria del Borgo", type: "Milanese Cuisine", zone: "Brera" },
      { name: "Il Luogo di Aimo e Nadia", type: "Fine Dining", zone: "Sant'Ambrogio" },
      { name: "Trattoria Milanese", type: "Traditional", zone: "Centro" },
      { name: "Ceresio 7", type: "Modern Italian", zone: "Porta Nuova" }
    ],
    nightlife: [
      { name: "Bamboo Bar", type: "Cocktails", zone: "Navigli" },
      { name: "Hollywood", type: "Mainstream Club", zone: "Corso Como" },
      { name: "Alcatraz", type: "Live Music Venue", zone: "Isola" },
      { name: "Apophis", type: "Underground Club", zone: "Navigli" }
    ],
    activities: [
      "Duomo Rooftop Experience",
      "La Scala Theatre Tour",
      "Navigli Canal Boat Tour",
      "San Siro Stadium Tour",
      "Fashion District Shopping Tour"
    ],
    accommodation: [
      { zone: "Brera", type: "Design hotels in art district" },
      { zone: "Navigli", type: "Trendy areas with canal views" },
      { zone: "Porta Nuova", type: "Modern skyscraper district" }
    ]
  },
  madrid: {
    name: "Madrid",
    restaurants: [
      { name: "Casa Lucio", type: "Traditional Spanish", zone: "La Latina" },
      { name: "Botín", type: "Historic (World's oldest restaurant)", zone: "Centro" },
      { name: "StreetXO", type: "Asian Fusion", zone: "Serrano" },
      { name: "Mercado de San Miguel", type: "Gourmet Market", zone: "Centro" }
    ],
    nightlife: [
      { name: "Teatro Joy Eslava", type: "Historic Club", zone: "Centro" },
      { name: "Kapital", type: "7-floor Megaclub", zone: "Atocha" },
      { name: "Almonte", type: "Rooftop Bar", zone: "Malasaña" },
      { name: "Cool", type: "Electronic Music", zone: "Centro" }
    ],
    activities: [
      "Prado Museum Skip-the-Line",
      "Real Madrid Stadium Tour",
      "Flamenco Show with Dinner",
      "Retiro Park Segway Tour",
      "Toledo Day Trip"
    ],
    accommodation: [
      { zone: "Centro/Sol", type: "Historic area near attractions" },
      { zone: "Malasaña", type: "Hip neighborhood with bars" },
      { zone: "Chueca", type: "Trendy area with nightlife" }
    ]
  },
  barcellona: {
    name: "Barcellona",
    restaurants: [
      { name: "Cal Pep", type: "Tapas Bar", zone: "Born" },
      { name: "Disfrutar", type: "Modern Catalan", zone: "Eixample" },
      { name: "Bar Mut", type: "Wine & Tapas", zone: "Eixample" },
      { name: "La Boqueria", type: "Market Food", zone: "Las Ramblas" }
    ],
    nightlife: [
      { name: "Opium", type: "Beach Club", zone: "Port Olimpic" },
      { name: "Shoko", type: "Asian-themed Club", zone: "Port Olimpic" },
      { name: "Razzmatazz", type: "Multi-room Club", zone: "Poble Nou" },
      { name: "Eclipse Bar", type: "Sky Bar", zone: "W Hotel" }
    ],
    activities: [
      "Sagrada Familia Fast Track",
      "Catamaran Party Cruise",
      "Park Güell Guided Tour",
      "Beach Volleyball Tournament",
      "Montjuic Cable Car & Castle"
    ],
    accommodation: [
      { zone: "Gothic Quarter", type: "Historic center with character" },
      { zone: "Eixample", type: "Modern area near Gaudi sites" },
      { zone: "Barceloneta", type: "Beach area with nightlife" }
    ]
  },
  valencia: {
    name: "Valencia",
    restaurants: [
      { name: "La Pepica", type: "Traditional Paella", zone: "Malvarossa Beach" },
      { name: "Casa Roberto", type: "Authentic Paella", zone: "Centro" },
      { name: "Vertical", type: "Modern Spanish", zone: "Ruzafa" },
      { name: "Central Bar", type: "Gourmet Tapas", zone: "Mercado Central" }
    ],
    nightlife: [
      { name: "Mya", type: "Electronic Club", zone: "Ciudad de las Artes" },
      { name: "Radio City", type: "Live Music", zone: "Centro" },
      { name: "The Cocktail Experience", type: "Craft Cocktails", zone: "Carmen" },
      { name: "Akuarela Playa", type: "Beach Bar", zone: "Malvarossa" }
    ],
    activities: [
      "City of Arts and Sciences Tour",
      "Albufera Natural Park Boat Trip",
      "Valencia Bike Tour",
      "Oceanografic Aquarium",
      "Paella Cooking Class"
    ],
    accommodation: [
      { zone: "Ciudad Vieja", type: "Historic center" },
      { zone: "Ruzafa", type: "Trendy neighborhood" },
      { zone: "Malvarossa", type: "Beach area" }
    ]
  },
  berlino: {
    name: "Berlino",
    restaurants: [
      { name: "Katz Orange", type: "Modern German", zone: "Mitte" },
      { name: "Lokal Modern", type: "Contemporary", zone: "Friedrichshain" },
      { name: "Hackesche Höfe", type: "Traditional German", zone: "Hackescher Markt" },
      { name: "Street Food auf Achse", type: "Food Trucks", zone: "Various" }
    ],
    nightlife: [
      { name: "Berghain", type: "Techno Temple", zone: "Friedrichshain" },
      { name: "Watergate", type: "Electronic", zone: "Kreuzberg" },
      { name: "Tresor", type: "Underground Techno", zone: "Mitte" },
      { name: "Klunkerkranich", type: "Rooftop Bar", zone: "Neukölln" }
    ],
    activities: [
      "Berlin Wall & Cold War Tour",
      "Beer Garden Crawl",
      "Brandenburg Gate Photo Tour",
      "Escape Room Berlin",
      "Spree River Boat Party"
    ],
    accommodation: [
      { zone: "Mitte", type: "Central area near attractions" },
      { zone: "Friedrichshain", type: "Alternative area with nightlife" },
      { zone: "Prenzlauer Berg", type: "Hip neighborhood" }
    ]
  },
  ibiza: {
    name: "Ibiza",
    restaurants: [
      { name: "Es Torrent", type: "Seafood", zone: "Cala d'Hort" },
      { name: "Can Pilot", type: "Traditional Ibicenco", zone: "San Rafael" },
      { name: "Amante", type: "Mediterranean", zone: "Sol d'en Serra" },
      { name: "Sa Foradada", type: "Cliffside Dining", zone: "Cala Deià" }
    ],
    nightlife: [
      { name: "Pacha", type: "Iconic Superclub", zone: "Ibiza Town" },
      { name: "Amnesia", type: "Electronic Paradise", zone: "San Rafael" },
      { name: "Ushuaïa", type: "Open-air Megaclub", zone: "Platja d'en Bossa" },
      { name: "DC10", type: "Underground Techno", zone: "Es Salinas" }
    ],
    activities: [
      "VIP Boat Charter",
      "Es Vedra Sunset Cruise",
      "Dalt Vila Old Town Tour",
      "Beach Club Hopping",
      "Jet Ski Adventure"
    ],
    accommodation: [
      { zone: "Ibiza Town", type: "Near port and nightlife" },
      { zone: "Platja d'en Bossa", type: "Beach clubs and parties" },
      { zone: "San Antonio", type: "Sunset bars and clubs" }
    ]
  },
  palma: {
    name: "Palma de Mallorca",
    restaurants: [
      { name: "Adrian Quetglas", type: "Modern Mediterranean", zone: "Centro" },
      { name: "Ca'n Joan de S'aigo", type: "Traditional Mallorquin", zone: "Centro" },
      { name: "Forn de Sant Joan", type: "Creative Cuisine", zone: "Centro" },
      { name: "Es Baluard", type: "Contemporary", zone: "Santa Catalina" }
    ],
    nightlife: [
      { name: "Tito's", type: "Historic Club", zone: "Paseo Marítimo" },
      { name: "BCM Planet Dance", type: "Superclub", zone: "Magaluf" },
      { name: "Pacha Mallorca", type: "Beach Club", zone: "El Arenal" },
      { name: "Anima Beach", type: "Sunset Lounge", zone: "Palma Beach" }
    ],
    activities: [
      "Catamaran Sailing Trip",
      "Palma Cathedral Tour",
      "Tramuntana Mountains Hike",
      "Caves of Drach Visit",
      "Quad Bike Adventure"
    ],
    accommodation: [
      { zone: "Palma Centro", type: "Historic city center" },
      { zone: "Playa de Palma", type: "Beach resort area" },
      { zone: "Santa Catalina", type: "Trendy neighborhood" }
    ]
  },
  londra: {
    name: "Londra",
    restaurants: [
      { name: "Dishoom", type: "Indian (Bombay Café)", zone: "Covent Garden" },
      { name: "Rules", type: "Traditional British", zone: "Covent Garden" },
      { name: "Sketch", type: "Contemporary Fine Dining", zone: "Mayfair" },
      { name: "Borough Market", type: "Food Market", zone: "London Bridge" }
    ],
    nightlife: [
      { name: "Ministry of Sound", type: "Electronic Superclub", zone: "Elephant & Castle" },
      { name: "Fabric", type: "Underground Electronic", zone: "Farringdon" },
      { name: "XOYO", type: "Alternative Club", zone: "Shoreditch" },
      { name: "Sky Garden", type: "Sky Bar", zone: "City of London" }
    ],
    activities: [
      "Thames Speedboat Experience",
      "Jack the Ripper Walking Tour",
      "London Eye Fast Track",
      "Premier League Stadium Tour",
      "Traditional Pub Crawl"
    ],
    accommodation: [
      { zone: "Shoreditch", type: "Hip area with nightlife" },
      { zone: "Covent Garden", type: "Central location" },
      { zone: "South Bank", type: "Modern area near attractions" }
    ]
  },
  amsterdam: {
    name: "Amsterdam",
    restaurants: [
      { name: "Café de Reiger", type: "Traditional Dutch", zone: "Jordaan" },
      { name: "Restaurant Greetje", type: "Modern Dutch", zone: "Nieuwmarkt" },
      { name: "De Kas", type: "Greenhouse Restaurant", zone: "Park Frankendael" },
      { name: "Foodhallen", type: "Indoor Food Market", zone: "Oud-West" }
    ],
    nightlife: [
      { name: "Paradiso", type: "Legendary Music Venue", zone: "Leidseplein" },
      { name: "Melkweg", type: "Multi-media Center", zone: "Leidseplein" },
      { name: "Club AIR", type: "Electronic Club", zone: "Amstelstraat" },
      { name: "SkyLounge", type: "Rooftop Bar", zone: "Centrum" }
    ],
    activities: [
      "Canal Cruise with Beer",
      "Bike Tour of the City",
      "Red Light District Walking Tour",
      "Heineken Experience",
      "Van Gogh Museum Fast Track"
    ],
    accommodation: [
      { zone: "Canal Ring", type: "Historic canal houses" },
      { zone: "Jordaan", type: "Charming neighborhood" },
      { zone: "Leidseplein", type: "Entertainment district" }
    ]
  },
  mykonos: {
    name: "Mykonos",
    restaurants: [
      { name: "Interni", type: "Mediterranean Fine Dining", zone: "Mykonos Town" },
      { name: "Kastro's", type: "Sunset Dining", zone: "Little Venice" },
      { name: "Funky Kitchen", type: "Creative Greek", zone: "Mykonos Town" },
      { name: "Sea Satin Market", type: "Fresh Seafood", zone: "Platys Gialos" }
    ],
    nightlife: [
      { name: "Paradise Club", type: "Beach Party Central", zone: "Paradise Beach" },
      { name: "Cavo Paradiso", type: "Cliffside Superclub", zone: "Paradise Beach" },
      { name: "Scorpios", type: "Bohemian Beach Club", zone: "Paraga Beach" },
      { name: "180° Sunset Bar", type: "Sunset Cocktails", zone: "Mykonos Town" }
    ],
    activities: [
      "Private Yacht Charter",
      "Delos Island Archaeological Tour",
      "ATV Island Adventure",
      "Beach Club Hopping Tour",
      "Traditional Greek Cooking Class"
    ],
    accommodation: [
      { zone: "Mykonos Town", type: "Luxury hotels near port" },
      { zone: "Platys Gialos", type: "Beach resort area" },
      { zone: "Ornos", type: "Family-friendly beach area" }
    ]
  }
};

// Schema per il form di input
const messageSchema = z.object({
  message: z.string().min(1, "Il messaggio non può essere vuoto"),
});

type MessageFormValues = z.infer<typeof messageSchema>;

// Tipo per i messaggi nella chat
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

// Tipo per gli elementi del pacchetto
interface PackageItem {
  id: string;
  type: 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport' | 'event';
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  date?: string;
  location?: string;
  duration?: string;
  rating?: string;
  selected: boolean;
}

export default function OneClickAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hey ragazzi! 🎉 Sono il vostro assistente ByeBro e sono qui per organizzare l\'addio al celibato più epico di sempre! \n\nHo tutte le info aggiornate per queste città PAZZESCHE:\n🇮🇹 Roma, Milano\n🇪🇸 Madrid, Barcellona, Valencia, Ibiza, Palma\n🇩🇪 Berlino\n🇬🇧 Londra\n🇳🇱 Amsterdam\n🇬🇷 Mykonos\n\nDitemi dove volete scatenarvi e vi preparo un itinerario da LEGGENDA! 🔥',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPackage, setIsGeneratingPackage] = useState(false);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<{start?: string, end?: string}>({});
  const [selectedPeople, setSelectedPeople] = useState<number>(0);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
    },
  });

  // Scroll automatico quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Calcolo del prezzo totale quando cambiano gli elementi selezionati
  useEffect(() => {
    const newTotal = packageItems
      .filter(item => item.selected)
      .reduce((acc, item) => acc + item.price, 0);
    setTotalPrice(newTotal);
  }, [packageItems]);

  // Function to detect city from user message
  const detectCity = (message: string): string | null => {
    const normalized = message.toLowerCase();
    
    if (normalized.includes('roma') || normalized.includes('rome')) return 'roma';
    if (normalized.includes('milano') || normalized.includes('milan')) return 'milano';
    if (normalized.includes('madrid')) return 'madrid';
    if (normalized.includes('barcellona') || normalized.includes('barcelona')) return 'barcellona';
    if (normalized.includes('valencia')) return 'valencia';
    if (normalized.includes('berlino') || normalized.includes('berlin')) return 'berlino';
    if (normalized.includes('ibiza')) return 'ibiza';
    if (normalized.includes('palma') || normalized.includes('mallorca')) return 'palma';
    if (normalized.includes('londra') || normalized.includes('london')) return 'londra';
    if (normalized.includes('amsterdam')) return 'amsterdam';
    if (normalized.includes('mykonos')) return 'mykonos';
    
    return null;
  };

  // Function to generate city recommendations
  const generateCityRecommendations = (cityKey: string, days: number = 3): string => {
    const city = CITY_DATA[cityKey as keyof typeof CITY_DATA];
    if (!city) return "Mi dispiace, non ho informazioni per questa città.";

    let response = `PERFETTO! ${city.name} è una scelta FANTASTICA! 🎉\n\n`;
    response += `Ecco l'itinerario BOMBA per ${days} giorni:\n\n`;

    // Restaurants
    response += `🍽️ **RISTORANTI E APERITIVI**\n`;
    city.restaurants.forEach(restaurant => {
      response += `• ${restaurant.name} (${restaurant.type}) - ${restaurant.zone}\n`;
    });

    // Nightlife
    response += `\n🎵 **VITA NOTTURNA**\n`;
    city.nightlife.forEach(club => {
      response += `• ${club.name} (${club.type}) - ${club.zone}\n`;
    });

    // Activities
    response += `\n🏃 **ATTIVITÀ DIURNE**\n`;
    city.activities.forEach(activity => {
      response += `• ${activity}\n`;
    });

    // Accommodation
    response += `\n🏨 **DOVE DORMIRE**\n`;
    city.accommodation.forEach(area => {
      response += `• ${area.zone}: ${area.type}\n`;
    });

    // Sample itinerary
    response += `\n📅 **ITINERARIO TIPO (${days} GIORNI)**\n`;
    if (days >= 1) {
      response += `**GIORNO 1:** Arrivo + ${city.activities[0]} + Aperitivo da ${city.restaurants[0].name} + Serata al ${city.nightlife[0].name}\n`;
    }
    if (days >= 2) {
      response += `**GIORNO 2:** ${city.activities[1]} + Pranzo da ${city.restaurants[1].name} + ${city.activities[2]} + Club ${city.nightlife[1].name}\n`;
    }
    if (days >= 3) {
      response += `**GIORNO 3:** ${city.activities[3] || city.activities[0]} + Ultima serata al ${city.nightlife[2]?.name || city.nightlife[0].name}\n`;
    }

    response += `\n🔥 Volete che vi prepari un pacchetto completo con voli, hotel e prenotazioni? Sarà EPICO!`;
    
    return response;
  };

  // Main response generation function
  const generateResponse = (userMessage: string): string => {
    const normalizedMessage = userMessage.toLowerCase();
    const detectedCity = detectCity(userMessage);
    
    // Set detected city for package generation
    if (detectedCity) {
      setSelectedDestination(detectedCity);
    }

    // Extract number of days if mentioned
    let days = 3; // default
    const dayMatch = userMessage.match(/(\d+)\s*(giorni?|days?|giorno)/i);
    if (dayMatch) {
      days = parseInt(dayMatch[1]);
    }

    // City-specific responses
    if (detectedCity) {
      return generateCityRecommendations(detectedCity, days);
    }

    // General responses based on context
    if (normalizedMessage.includes('date') || normalizedMessage.includes('quando') || normalizedMessage.includes('giorno')) {
      return "Perfetto! 📅 Quando pensate di partire? Ditemi il mese o le date che avete in mente e vi organizzo tutto nei minimi dettagli!";
    }
    
    if (normalizedMessage.includes('person') || normalizedMessage.includes('amici') || normalizedMessage.includes('gruppo') || /\d+/.test(normalizedMessage)) {
      const match = normalizedMessage.match(/\d+/);
      if (match) {
        setSelectedPeople(parseInt(match[0]));
        return `Fantastico! Un gruppo di ${match[0]} persone! 🎯 Ora ditemi la città che vi ispira di più e vi preparo un itinerario che vi lascerà senza fiato!`;
      }
      return "Grande! Quante persone sarete in totale? Così posso consigliarvi gli alloggi e le attività perfette per il vostro gruppo!";
    }
    
    if (normalizedMessage.includes('pacchetto') || normalizedMessage.includes('package') || normalizedMessage.includes('prenota') || normalizedMessage.includes('organizza')) {
      return "PERFETTO! 🚀 Sto preparando un pacchetto completo con tutte le opzioni migliori. Voli, alloggi, ristoranti, vita notturna e attività pazzesche - tutto in un click!";
    }
    
    if (normalizedMessage.includes('budget') || normalizedMessage.includes('prezzo') || normalizedMessage.includes('costo') || normalizedMessage.includes('€') || normalizedMessage.includes('euro')) {
      return "Ottima domanda! 💰 I prezzi variano a seconda della città e del periodo. Ditemi la destinazione e vi do un'idea precisa dei costi per voli, hotel e divertimento!";
    }
    
    // Default response
    return "Ciao! 👋 Scegliete una delle nostre 11 città top per l'addio al celibato: Roma, Milano, Madrid, Barcellona, Valencia, Berlino, Ibiza, Palma de Mallorca, Londra, Amsterdam, Mykonos. Dimmi la città e vi organizzo tutto!";
  };

  const onSubmit = async (data: MessageFormValues) => {
    // Aggiungi il messaggio dell'utente alla chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: data.message,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    form.reset();
    setIsLoading(true);

    try {
      setTimeout(() => {
        const assistantResponse = generateResponse(data.message);
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: assistantResponse,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        
        // Se l'utente ha fornito abbastanza informazioni, suggeriamo di generare un pacchetto
        if (messages.length > 4 && selectedDestination) {
          setTimeout(() => {
            const finalMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              content: "Grazie per le informazioni! Vuoi che generi un pacchetto personalizzato per te?",
              sender: 'assistant',
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, finalMessage]);
          }, 1000);
        }
      }, 1500);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore nella comunicazione con l'assistente",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">One Click Assistant</h1>
              <p className="text-sm text-gray-500">Il tuo assistente personale per l'addio al celibato perfetto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 container mx-auto max-w-4xl p-4">
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat Assistant
            </CardTitle>
            <CardDescription>
              Chatta con il nostro assistente per organizzare il tuo addio al celibato
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {/* Messages Area */}
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[80%]">
                      {message.sender === 'assistant' && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-red-600 text-white text-xs">
                            BB
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.sender === 'user' && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gray-600 text-white text-xs">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-red-600 text-white text-xs">
                          BB
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-600">Sto scrivendo...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <Input
                {...form.register('message')}
                placeholder="Scrivi qui il tuo messaggio..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}