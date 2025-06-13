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
import { Loader2, Send, Calendar, MapPin, Utensils, Music, Plane, Car, Gift, PlusCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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
      content: 'Ciao! Sono il tuo assistente ByeBro. Ti aiuterò a creare un pacchetto completo per l\'addio al celibato perfetto. Dimmi quale destinazione ti interessa e quali date stai considerando!',
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
      // In una implementazione reale, qui chiameremmo l'API OpenAI
      // Per ora simuliamo una risposta dopo un breve ritardo
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
        if (messages.length > 4) {
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

  // Simulazione delle risposte dell'assistente (in un'implementazione reale utilizzerebbe OpenAI)
  const generateResponse = (userMessage: string): string => {
    const normalizedMessage = userMessage.toLowerCase();
    
    if (normalizedMessage.includes('amsterdam') || normalizedMessage.includes('olanda')) {
      setSelectedDestination('amsterdam');
      return "Amsterdam è una scelta eccellente per un addio al celibato! Offre locali notturni, ottima birra e molto altro. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('praga') || normalizedMessage.includes('repubblica ceca')) {
      setSelectedDestination('praga');
      return "Praga è una destinazione fantastica per un addio al celibato! È famosa per la sua birra, vita notturna e prezzi accessibili. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('budapest') || normalizedMessage.includes('ungheria')) {
      setSelectedDestination('budapest');
      return "Budapest è una meta popolare per gli addii al celibato! Offre bagni termali, ruin bar e ottimo cibo. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('barcellona') || normalizedMessage.includes('spagna')) {
      setSelectedDestination('barcellona');
      return "Barcellona è perfetta per un addio al celibato! Offre belle spiagge, vita notturna eccezionale e ottimo cibo. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('berlino') || normalizedMessage.includes('germania')) {
      setSelectedDestination('berlino');
      return "Berlino è una scelta fantastica per un addio al celibato! Ha una vita notturna leggendaria e molte esperienze uniche. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('ibiza')) {
      setSelectedDestination('ibiza');
      return "IBIZA! La destinazione PERFETTA per un addio al celibato! 🏖️\n\nHai a disposizione:\n\n🍽️ RISTORANTI:\n• Fascia alta: Es Tragón ⭐️ Michelin (€200+), La Gaia (€185), Etxeko (€175)\n• Fascia media: Amante (€50-80), La Paloma (€40-60)\n• Budget: Street food/paella locali (€15-25)\n\n🎧 VITA NOTTURNA:\n• Club famosi: Pacha (€50-80), Hï Ibiza (€80-120), DC10/Circoloco (€56-94), Amnesia (€55-75)\n• Tavoli VIP da €300+ a persona\n• Drink: €15-30 cocktail, €10-15 birra\n\n💡 CONSIGLI:\n• Prenota ristoranti top in anticipo\n• Pre-drink prima dei club per risparmiare\n• Biglietti online = risparmio €10-20\n\nIn che periodo pensate di andarci? E che budget avete in mente?";
    } else if (
      normalizedMessage.includes('date') || 
      normalizedMessage.includes('quando') || 
      normalizedMessage.includes('giorno')
    ) {
      return "Perfetto! E quante persone parteciperanno al viaggio? Così posso consigliarti le migliori opzioni per alloggi e attività.";
    } else if (
      normalizedMessage.includes('person') || 
      normalizedMessage.includes('amici') || 
      normalizedMessage.includes('partecipanti') || 
      normalizedMessage.includes('gruppo')
    ) {
      return "Ottimo! Ti interessano più attività rilassanti o preferisci un'esperienza più movimentata? Hai interessi particolari come sport, degustazioni, esperienze culturali?";
    } else if (
      normalizedMessage.includes('budget') && 
      selectedDestination === 'ibiza'
    ) {
      return "Per Ibiza i budget tipici sono:\n\n💰 BUDGET ECONOMICO (€150-250/giorno):\n• Hotel base o ostello\n• Cene in tapas bar (€15-45)\n• Club standard (€50-80 ingresso)\n• Pre-drink per risparmiare\n\n💸 BUDGET MEDIO (€300-500/giorno):\n• Hotel 4 stelle\n• Ristoranti medi (€50-80)\n• Mix club + qualche VIP experience\n• Boat party incluso\n\n🏆 BUDGET ALTO (€600+/giorno):\n• Hotel luxury (Ushuaïa)\n• Ristoranti stellati\n• Tavoli VIP nei club top\n• Esperienze esclusive\n\nQuale si avvicina di più alle vostre possibilità?";
    } else if (
      normalizedMessage.includes('stagione') || 
      normalizedMessage.includes('periodo') || 
      (normalizedMessage.includes('quando') && selectedDestination === 'ibiza')
    ) {
      return "📅 STAGIONI A IBIZA:\n\n🔥 ALTA STAGIONE (Giugno-Settembre):\n• Prezzi massimi ma massima energia\n• Tutti i club aperti\n• Temperature perfette (25-30°C)\n• Mare caldo\n\n🌞 MEDIA STAGIONE (Maggio + Ottobre):\n• Prezzi più accessibili (-30%)\n• Molti eventi ancora attivi\n• Meno affollato\n• Clima ottimo\n\n❄️ BASSA STAGIONE (Nov-Aprile):\n• Prezzi minimi ma molti club chiusi\n• Principalmente per relax\n\nPer un addio al celibato consiglio Maggio-Settembre per avere tutto aperto!";
    } else if (
      normalizedMessage.includes('genera') || 
      normalizedMessage.includes('crea') || 
      normalizedMessage.includes('pacchetto') ||
      normalizedMessage.includes('proposta')
    ) {
      setTimeout(() => {
        generatePackage();
      }, 1000);
      return "Sto generando un pacchetto personalizzato in base alle tue preferenze. Dammi solo un momento...";
    }
    
    return "Grazie per queste informazioni! Hai altre preferenze o richieste particolari per il tuo addio al celibato?";
  };

  // Genera un pacchetto con opzioni per volo, hotel, ristoranti e attività
  const generatePackage = () => {
    setIsGeneratingPackage(true);
    
    // Simuliamo una chiamata API
    setTimeout(() => {
      let dummyPackage: PackageItem[] = [];
      
      // Pacchetti specifici per destinazione
      if (selectedDestination === 'ibiza') {
        dummyPackage = [
          {
            id: '1',
            type: 'flight',
            title: 'Volo per Ibiza',
            description: 'Volo diretto da Milano a Ibiza, andata e ritorno',
            price: 299.99,
            imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80',
            date: '15 Luglio 2025',
            duration: '2h 15min',
            selected: true
          },
          {
            id: '2',
            type: 'hotel',
            title: 'Hotel Pacha',
            description: 'Hotel iconico nel cuore di Ibiza, perfetto per la vita notturna',
            price: 180.99,
            imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Ibiza Town',
            rating: '4.6',
            selected: true
          },
          {
            id: '3',
            type: 'hotel',
            title: 'Ushuaïa Ibiza Beach Hotel',
            description: 'Hotel luxury con pool party e eventi esclusivi',
            price: 350.99,
            imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Platja d\'en Bossa',
            rating: '4.8',
            selected: false
          },
          {
            id: '4',
            type: 'restaurant',
            title: 'Amante Beach Restaurant',
            description: 'Ristorante con vista mozzafiato e cucina mediterranea (€50-80)',
            price: 65.99,
            imageUrl: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80',
            location: 'Sol d\'en Serra',
            rating: '4.7',
            selected: true
          },
          {
            id: '5',
            type: 'restaurant',
            title: 'Es Tragón - Michelin Star',
            description: 'Esperienza gastronomica stellata, il top di Ibiza (€200+)',
            price: 220.99,
            imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Sant Llorenç de Balàfia',
            rating: '4.9',
            selected: false
          },
          {
            id: '6',
            type: 'event',
            title: 'Ingresso Pacha Club',
            description: 'Notte al club più famoso di Ibiza (include 1 drink)',
            price: 65.99,
            imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Ibiza Town',
            duration: 'Tutta la notte',
            selected: true
          },
          {
            id: '7',
            type: 'event',
            title: 'Hï Ibiza VIP Experience',
            description: 'Tavolo VIP al club più tecnologico di Ibiza (€80-120 + consumazioni)',
            price: 450.99,
            imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Platja d\'en Bossa',
            duration: 'Esperienza VIP',
            selected: false
          },
          {
            id: '8',
            type: 'activity',
            title: 'Boat Party Premium',
            description: 'Festa in barca con DJ, open bar e snorkeling',
            price: 89.99,
            imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'Marina di Ibiza',
            duration: '6 ore',
            selected: true
          },
          {
            id: '9',
            type: 'activity',
            title: 'Jet Ski Adventure',
            description: 'Tour in jet ski lungo la costa di Ibiza',
            price: 120.99,
            imageUrl: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            location: 'San Antonio Bay',
            duration: '2 ore',
            selected: false
          },
          {
            id: '10',
            type: 'transport',
            title: 'Transfer + Taxi Pass',
            description: 'Transfer aeroporto + taxi illimitati per 3 giorni',
            price: 45.99,
            imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            duration: '3 giorni',
            selected: true
          }
        ];
      } else if (!selectedDestination || selectedDestination === 'amsterdam') {
        dummyPackage = [
          {
            id: '1',
            type: 'flight',
            title: 'Volo diretto per Amsterdam',
            description: 'Volo Alitalia da Milano Malpensa a Amsterdam Schiphol, andata e ritorno',
            price: 189.99,
            imageUrl: 'https://images.unsplash.com/photo-1507812984078-917a274065be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            date: '15 Giugno 2025',
            duration: '1h 45min',
            selected: true
          },
          {
            id: '2',
            type: 'hotel',
            title: 'The Flying Pig Downtown Hostel',
            description: 'Ostello economico nel centro di Amsterdam, ideale per gruppi',
            price: 45.99,
            imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Centro di Amsterdam',
            rating: '4.2',
            selected: true
          },
          {
            id: '3',
            type: 'hotel',
            title: 'Hilton Amsterdam',
            description: 'Hotel di lusso con tutti i comfort per un\'esperienza premium',
            price: 189.99,
            imageUrl: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80',
            location: 'Amsterdam Zuid',
            rating: '4.8',
            selected: false
          },
          {
            id: '4',
            type: 'restaurant',
            title: 'REM Eiland',
            description: 'Ristorante unico su una ex piattaforma di trasmissione in mare',
            price: 45.99,
            imageUrl: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            location: 'Amsterdam Ovest',
            rating: '4.5',
            selected: true
          },
          {
            id: '5',
            type: 'activity',
            title: 'Tour Heineken Experience',
            description: 'Visita alla famosa fabbrica di birra con degustazione inclusa',
            price: 21.99,
            imageUrl: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Centro di Amsterdam',
            duration: '1.5 ore',
            selected: true
          },
          {
            id: '6',
            type: 'activity',
            title: 'Giro in barca sui canali',
            description: 'Tour privato in barca sui canali con birra inclusa',
            price: 35.99,
            imageUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Canali di Amsterdam',
            duration: '2 ore',
            selected: true
          },
          {
            id: '7',
            type: 'activity',
            title: 'Ingresso al casino Holland',
            description: 'Una serata di divertimento al casino più famoso di Amsterdam',
            price: 15.99,
            imageUrl: 'https://images.unsplash.com/photo-1529973625058-a665431328fb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1887&q=80',
            location: 'Centro di Amsterdam',
            duration: 'Accesso giornaliero',
            selected: false
          },
          {
            id: '8',
            type: 'transport',
            title: 'Amsterdam Travel Card',
            description: 'Trasporto pubblico illimitato per 3 giorni',
            price: 28.99,
            imageUrl: 'https://images.unsplash.com/photo-1527150122257-eda8fb9c0999?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80',
            duration: '3 giorni',
            selected: true
          }
        ];
      }
      
      setPackageItems(dummyPackage);
      setShowPackageDialog(true);
      setIsGeneratingPackage(false);
      
      // Aggiungi messaggio di conferma
      const confirmMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        content: "Perfetto! Ho generato un pacchetto personalizzato per te. Puoi vedere tutti i dettagli e personalizzare le opzioni. Quando sei pronto, puoi procedere con il checkout.",
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, confirmMessage]);
    }, 2000);
  };

  const toggleItemSelection = (itemId: string) => {
    setPackageItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleCheckout = () => {
    setShowPackageDialog(false);
    setCheckoutDialogOpen(true);
    
    const checkoutMessage: ChatMessage = {
      id: (Date.now() + 4).toString(),
      content: `Ottimo! Il tuo pacchetto costa in totale €${totalPrice.toFixed(2)}. Procediamo con il pagamento.`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, checkoutMessage]);
  };

  const handlePayment = () => {
    // Simulazione pagamento
    setCheckoutDialogOpen(false);
    
    const paymentMessage: ChatMessage = {
      id: (Date.now() + 5).toString(),
      content: "Fantastico! Il pagamento è stato completato con successo. Riceverai tutte le conferme di prenotazione via email. Buon viaggio!",
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, paymentMessage]);
    
    toast({
      title: "Pagamento completato!",
      description: "Il tuo pacchetto è stato prenotato con successo.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
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
              <Send className="w-5 h-5" />
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

      {/* Package Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Il tuo pacchetto personalizzato</DialogTitle>
            <DialogDescription>
              Seleziona i servizi che desideri includere nel tuo pacchetto
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {packageItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          {item.location && (
                            <p className="text-xs text-gray-500 mt-1">📍 {item.location}</p>
                          )}
                          {item.duration && (
                            <p className="text-xs text-gray-500">⏱️ {item.duration}</p>
                          )}
                          {item.rating && (
                            <p className="text-xs text-gray-500">⭐ {item.rating}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">€{item.price}</p>
                          <Badge variant={item.selected ? "default" : "outline"}>
                            {item.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemSelection(item.id)}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex items-center justify-between">
            <div className="text-lg font-bold">
              Totale: €{totalPrice.toFixed(2)}
            </div>
            <Button onClick={handleCheckout} disabled={totalPrice === 0}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Procedi al Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Conferma il tuo ordine e procedi al pagamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Riepilogo ordine</h3>
              {packageItems.filter(item => item.selected).map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span>{item.title}</span>
                  <span>€{item.price}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Totale</span>
                <span>€{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handlePayment}>
              <Gift className="w-4 h-4 mr-2" />
              Paga Ora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}