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

  // Elaborazione delle risposte dell'assistente in base al messaggio dell'utente
  const generateResponse = (userMessage: string): string => {
    const normalizedMessage = userMessage.toLowerCase();
    
    // Rilevamento della destinazione
    if (normalizedMessage.includes('amsterdam') || normalizedMessage.includes('olanda')) {
      setSelectedDestination('amsterdam');
      return "Amsterdam è una scelta eccellente per un addio al celibato! Offre locali notturni, ottima birra e molto altro. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('praga') || normalizedMessage.includes('repubblica ceca')) {
      setSelectedDestination('prague');
      return "Praga è una destinazione fantastica per un addio al celibato! È famosa per la sua birra, vita notturna e prezzi accessibili. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('budapest') || normalizedMessage.includes('ungheria')) {
      setSelectedDestination('budapest');
      return "Budapest è una meta popolare per gli addii al celibato! Offre bagni termali, ruin bar e ottimo cibo. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('barcellona') || normalizedMessage.includes('spagna')) {
      setSelectedDestination('barcelona');
      return "Barcellona è perfetta per un addio al celibato! Offre belle spiagge, vita notturna eccezionale e ottimo cibo. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('berlino') || normalizedMessage.includes('germania')) {
      setSelectedDestination('berlin');
      return "Berlino è una scelta fantastica per un addio al celibato! Ha una vita notturna leggendaria e molte esperienze uniche. In quali date vorresti andarci? E quante persone parteciperanno?";
    } 
    
    // Rilevamento delle date
    else if (
      normalizedMessage.includes('date') || 
      normalizedMessage.includes('quando') || 
      normalizedMessage.includes('giorno') ||
      normalizedMessage.includes('giugno') ||
      normalizedMessage.includes('luglio') ||
      normalizedMessage.includes('agosto') ||
      normalizedMessage.includes('settembre')
    ) {
      // Estrazione delle date dal messaggio (versione semplificata)
      if (normalizedMessage.includes('giugno')) {
        setSelectedDates({start: '2025-06-15', end: '2025-06-20'});
      } else if (normalizedMessage.includes('luglio')) {
        setSelectedDates({start: '2025-07-15', end: '2025-07-20'});
      } else if (normalizedMessage.includes('agosto')) {
        setSelectedDates({start: '2025-08-15', end: '2025-08-20'});
      } else if (normalizedMessage.includes('settembre')) {
        setSelectedDates({start: '2025-09-15', end: '2025-09-20'});
      } else {
        setSelectedDates({start: '2025-06-15', end: '2025-06-20'});
      }
      
      return "Perfetto! E quante persone parteciperanno al viaggio? Così posso consigliarti le migliori opzioni per alloggi e attività.";
    } 
    
    // Rilevamento del numero di persone
    else if (
      normalizedMessage.includes('person') || 
      normalizedMessage.includes('amici') || 
      normalizedMessage.includes('partecipanti') || 
      normalizedMessage.includes('gruppo') ||
      /\d+/.test(normalizedMessage) // Regex per rilevare numeri
    ) {
      // Estrazione del numero di persone (versione semplificata)
      const match = normalizedMessage.match(/\d+/);
      if (match) {
        setSelectedPeople(parseInt(match[0], 10));
      } else {
        setSelectedPeople(6); // Valore di default
      }
      
      return "Ottimo! Ti interessano più attività rilassanti o preferisci un'esperienza più movimentata? Hai interessi particolari come sport, degustazioni, esperienze culturali?";
    } 
    
    // Generazione del pacchetto
    else if (
      normalizedMessage.includes('genera') || 
      normalizedMessage.includes('crea') || 
      normalizedMessage.includes('pacchetto') ||
      normalizedMessage.includes('proposta') ||
      normalizedMessage.includes('mostra') ||
      normalizedMessage.includes('sì') ||
      normalizedMessage.includes('si') ||
      normalizedMessage.includes('ok')
    ) {
      setTimeout(() => {
        generatePackage();
      }, 1000);
      return "Sto generando un pacchetto personalizzato in base alle tue preferenze. Dammi solo un momento...";
    }
    
    // Risposta di default
    return "Grazie per queste informazioni! Hai altre preferenze o richieste particolari per il tuo addio al celibato?";
  };

  // Fallback ai dati di esempio se c'è un errore con le API
  const generateFallbackPackage = () => {
    let dummyPackage: PackageItem[] = [];
    
    // Se nessuna destinazione è selezionata, impostiamo Amsterdam di default
    if (!selectedDestination || selectedDestination === 'amsterdam') {
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
    } else if (selectedDestination === 'prague') {
      dummyPackage = [
        {
          id: '1',
          type: 'flight',
          title: 'Volo diretto per Praga',
          description: 'Volo Czech Airlines da Milano Malpensa a Praga Václav Havel, andata e ritorno',
          price: 169.99,
          imageUrl: 'https://images.unsplash.com/photo-1586449480584-34302e933441?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          date: '15 Giugno 2025',
          duration: '1h 30min',
          selected: true
        },
        {
          id: '2',
          type: 'hotel',
          title: 'Czech Inn',
          description: 'Ostello moderno nel centro di Praga, ideale per gruppi',
          price: 35.99,
          imageUrl: 'https://images.unsplash.com/photo-1598495496118-f8763b94bde1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
          location: 'Centro storico di Praga',
          rating: '4.3',
          selected: true
        },
        {
          id: '3',
          type: 'hotel',
          title: 'Hilton Prague Old Town',
          description: 'Hotel di lusso nel quartiere storico di Praga',
          price: 169.99,
          imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Città Vecchia di Praga',
          rating: '4.7',
          selected: false
        },
        {
          id: '4',
          type: 'restaurant',
          title: 'Lokál Dlouhááá',
          description: 'Ristorante tradizionale ceco con ottima birra locale',
          price: 25.99,
          imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Centro di Praga',
          rating: '4.6',
          selected: true
        },
        {
          id: '5',
          type: 'activity',
          title: 'Tour delle birrerie di Praga',
          description: 'Visita a 3 birrerie storiche con degustazione inclusa',
          price: 29.99,
          imageUrl: 'https://images.unsplash.com/photo-1600095760934-9e913f921dc6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
          location: 'Centro di Praga',
          duration: '3 ore',
          selected: true
        },
        {
          id: '6',
          type: 'activity',
          title: 'Crociera sul fiume Moldava',
          description: 'Tour serale con cena e bevande incluse',
          price: 45.99,
          imageUrl: 'https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Fiume Moldava, Praga',
          duration: '2 ore',
          selected: true
        },
        {
          id: '7',
          type: 'transport',
          title: 'Prague Travel Card',
          description: 'Trasporto pubblico illimitato per 3 giorni',
          price: 22.99,
          imageUrl: 'https://images.unsplash.com/photo-1501623774294-6b93428aef20?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80',
          duration: '3 giorni',
          selected: true
        }
      ];
    } 
    // Budapest
    else if (selectedDestination === 'budapest') {
      dummyPackage = [
        {
          id: '1',
          type: 'flight',
          title: 'Volo diretto per Budapest',
          description: 'Volo Wizz Air da Milano Malpensa a Budapest Ferenc Liszt, andata e ritorno',
          price: 149.99,
          imageUrl: 'https://images.unsplash.com/photo-1572356722933-2dca3b3e5d0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          date: '15 Giugno 2025',
          duration: '1h 40min',
          selected: true
        },
        {
          id: '2',
          type: 'hotel',
          title: 'Wombats City Hostel',
          description: 'Ostello moderno nel centro di Budapest, ideale per gruppi',
          price: 30.99,
          imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Centro di Budapest',
          rating: '4.4',
          selected: true
        },
        {
          id: '4',
          type: 'restaurant',
          title: 'Mazel Tov',
          description: 'Ristorante trendy nel quartiere ebraico con cucina mediorientale',
          price: 35.99,
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
          location: 'Quartiere ebraico, Budapest',
          rating: '4.7',
          selected: true
        },
        {
          id: '5',
          type: 'activity',
          title: 'Terme Széchenyi',
          description: 'Giornata di relax nei bagni termali più famosi della città',
          price: 22.99,
          imageUrl: 'https://images.unsplash.com/photo-1549321495-305eb13f8aa9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
          location: 'Parco della Città, Budapest',
          duration: 'Giornaliero',
          selected: true
        },
        {
          id: '6',
          type: 'activity',
          title: 'Boat Party sul Danubio',
          description: 'Festa in barca con musica, bevande e vista notturna sulla città',
          price: 39.99,
          imageUrl: 'https://images.unsplash.com/photo-1571694330263-a325ca5d3cdf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Fiume Danubio, Budapest',
          duration: '3 ore',
          selected: true
        },
        {
          id: '7',
          type: 'transport',
          title: 'Budapest Travel Card',
          description: 'Trasporto pubblico illimitato per 3 giorni',
          price: 22.99,
          imageUrl: 'https://images.unsplash.com/photo-1505245208761-ba872912fac0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          duration: '3 giorni',
          selected: true
        }
      ];
    }
    // Barcellona
    else if (selectedDestination === 'barcelona') {
      dummyPackage = [
        {
          id: '1',
          type: 'flight',
          title: 'Volo diretto per Barcellona',
          description: 'Volo Vueling da Milano Malpensa a Barcellona El Prat, andata e ritorno',
          price: 179.99,
          imageUrl: 'https://images.unsplash.com/photo-1525154661349-45aa10ee53e0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          date: '15 Giugno 2025',
          duration: '1h 55min',
          selected: true
        },
        {
          id: '2',
          type: 'hotel',
          title: 'Generator Barcelona',
          description: 'Ostello moderno vicino alla Sagrada Familia',
          price: 42.99,
          imageUrl: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Gracia, Barcellona',
          rating: '4.3',
          selected: true
        },
        {
          id: '4',
          type: 'restaurant',
          title: 'La Paradeta',
          description: 'Ristorante di pesce fresco in stile mercato',
          price: 40.99,
          imageUrl: 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Born, Barcellona',
          rating: '4.6',
          selected: true
        },
        {
          id: '5',
          type: 'activity',
          title: 'Tour del Barrio Gotico',
          description: 'Visita guidata del quartiere gotico con degustazione di tapas e sangria',
          price: 29.99,
          imageUrl: 'https://images.unsplash.com/photo-1558599235-c6945be50305?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Barrio Gotico, Barcellona',
          duration: '3 ore',
          selected: true
        },
        {
          id: '6',
          type: 'activity',
          title: 'Barceloneta Beach Day',
          description: 'Giornata in spiaggia con noleggio lettini e drink inclusi',
          price: 25.99,
          imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Barceloneta, Barcellona',
          duration: 'Giornaliero',
          selected: true
        },
        {
          id: '7',
          type: 'transport',
          title: 'Barcelona Travel Card',
          description: 'Trasporto pubblico illimitato per 3 giorni',
          price: 24.99,
          imageUrl: 'https://images.unsplash.com/photo-1646044528173-13ade7ccf079?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          duration: '3 giorni',
          selected: true
        }
      ];
    }
    // Berlino
    else if (selectedDestination === 'berlin') {
      dummyPackage = [
        {
          id: '1',
          type: 'flight',
          title: 'Volo diretto per Berlino',
          description: 'Volo Lufthansa da Milano Malpensa a Berlino Brandeburgo, andata e ritorno',
          price: 199.99,
          imageUrl: 'https://images.unsplash.com/photo-1504276048855-f3d60e69632f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          date: '15 Giugno 2025',
          duration: '1h 50min',
          selected: true
        },
        {
          id: '2',
          type: 'hotel',
          title: 'Generator Berlin Mitte',
          description: 'Ostello moderno nel centro di Berlino',
          price: 38.99,
          imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Mitte, Berlino',
          rating: '4.2',
          selected: true
        },
        {
          id: '4',
          type: 'restaurant',
          title: 'Burgermeister',
          description: 'Famoso fast food di hamburger in un ex bagno pubblico sotto la metropolitana',
          price: 20.99,
          imageUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=722&q=80',
          location: 'Kreuzberg, Berlino',
          rating: '4.5',
          selected: true
        },
        {
          id: '5',
          type: 'activity',
          title: 'Pub Crawl a Kreuzberg',
          description: 'Tour dei migliori locali del quartiere più vivace di Berlino',
          price: 34.99,
          imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
          location: 'Kreuzberg, Berlino',
          duration: '4 ore',
          selected: true
        },
        {
          id: '6',
          type: 'activity',
          title: 'Berghain Club',
          description: 'Biglietti per il club techno più famoso al mondo (ingresso non garantito!)',
          price: 25.99,
          imageUrl: 'https://images.unsplash.com/photo-1642982660372-be380c9a92c7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          location: 'Friedrichshain, Berlino',
          duration: 'Notte intera',
          selected: true
        },
        {
          id: '7',
          type: 'transport',
          title: 'Berlin Travel Card',
          description: 'Trasporto pubblico illimitato per 3 giorni',
          price: 26.99,
          imageUrl: 'https://images.unsplash.com/photo-1531501410720-c8d437636201?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
          duration: '3 giorni',
          selected: true
        }
      ];
    }
    
    setPackageItems(dummyPackage);
    setShowPackageDialog(true);
    
    // Crea un messagio con il pacchetto generato
    const packageReadyMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Ho generato un pacchetto personalizzato per il tuo addio al celibato! Include volo, alloggio, attività e altro. Clicca sul pulsante "Vedi Pacchetto" per visualizzare i dettagli.`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, packageReadyMessage]);
  };

  // Genera un pacchetto con opzioni per volo, hotel, ristoranti e attività
  const generatePackage = async () => {
    setIsGeneratingPackage(true);
    let packageItems: PackageItem[] = [];
    
    try {
      // Usa selectedDestination, selectedDates, e selectedPeople per generare un pacchetto
      const destination = selectedDestination || 'amsterdam';
      
      // Crea la richiesta di pacchetto
      const packageRequest: PackageRequest = {
        destination: destination,
        startDate: selectedDates.start || '2025-06-15',
        endDate: selectedDates.end || '2025-06-20',
        adults: selectedPeople || 6,
        budget: 'standard'
      };
      
      // Per ogni tipo di elemento, gestisci separatamente gli errori
      try {
        // Ottieni voli
        const flights = await travelService.getFlights(
          'MXP', // origin (Milano Malpensa)
          packageRequest.destination, 
          packageRequest.startDate, 
          packageRequest.endDate,
          packageRequest.adults
        );
        
        if (flights && flights.length > 0) {
          packageItems.push({
            id: flights[0].id,
            type: 'flight',
            title: `Volo per ${flights[0].destination}`,
            description: `Volo ${flights[0].airline} da ${flights[0].origin} a ${flights[0].destination}, andata e ritorno`,
            price: flights[0].price,
            imageUrl: 'https://images.unsplash.com/photo-1507812984078-917a274065be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            date: flights[0].departureDate,
            duration: flights[0].duration,
            selected: true
          });
        }
      } catch (error) {
        console.error("Error fetching flights:", error);
      }
      
      try {
        // Ottieni hotel
        const hotels = await travelService.getHotels(
          packageRequest.destination,
          packageRequest.startDate,
          packageRequest.endDate,
          packageRequest.adults
        );
        
        if (hotels && hotels.length > 0) {
          // Aggiungi hotel economico
          const budgetHotel = hotels.find(h => h.price < 100) || hotels[0];
          packageItems.push({
            id: budgetHotel.id,
            type: 'hotel',
            title: budgetHotel.name,
            description: budgetHotel.description,
            price: budgetHotel.price,
            imageUrl: budgetHotel.images[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: budgetHotel.city,
            rating: budgetHotel.rating.toString(),
            selected: true
          });
          
          // Aggiungi hotel di lusso
          const luxuryHotel = hotels.find(h => h.price > 150) || hotels[hotels.length - 1];
          packageItems.push({
            id: luxuryHotel.id,
            type: 'hotel',
            title: luxuryHotel.name,
            description: luxuryHotel.description,
            price: luxuryHotel.price,
            imageUrl: luxuryHotel.images[0] || 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80',
            location: luxuryHotel.city,
            rating: luxuryHotel.rating.toString(),
            selected: false
          });
        }
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
      
      try {
        // Ottieni ristoranti
        const restaurants = await travelService.getRestaurants(packageRequest.destination);
        
        if (restaurants && restaurants.length > 0) {
          const restaurant = restaurants[0];
          packageItems.push({
            id: restaurant.id,
            type: 'restaurant',
            title: restaurant.name,
            description: restaurant.description,
            price: restaurant.price,
            imageUrl: restaurant.images[0] || 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            location: restaurant.city,
            rating: restaurant.rating.toString(),
            selected: true
          });
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
      
      try {
        // Ottieni attività
        const activities = await travelService.getActivities(packageRequest.destination);
        
        if (activities && activities.length > 0) {
          activities.slice(0, 3).forEach((activity, index) => {
            packageItems.push({
              id: activity.id,
              type: 'activity',
              title: activity.name,
              description: activity.description,
              price: activity.price,
              imageUrl: activity.images[0] || 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
              location: activity.city,
              duration: activity.duration,
              rating: activity.rating.toString(),
              selected: index === 0 // Seleziona solo la prima attività di default
            });
          });
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
      }
      
      // Aggiungi trasporto locale
      packageItems.push({
        id: 'transport1',
        type: 'transport',
        title: `${packageRequest.destination.charAt(0).toUpperCase() + packageRequest.destination.slice(1)} Travel Card`,
        description: 'Trasporto pubblico illimitato per 3 giorni',
        price: 28.99,
        imageUrl: 'https://images.unsplash.com/photo-1527150122257-eda8fb9c0999?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80',
        duration: '3 giorni',
        selected: true
      });
      
      // Se non abbiamo ottenuto nessun elemento dal servizio, usiamo il fallback
      if (packageItems.length <= 1) {
        generateFallbackPackage();
        return;
      }
      
      setPackageItems(packageItems);
      setShowPackageDialog(true);
      
      // Crea un messagio con il pacchetto generato
      const packageReadyMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `Ho generato un pacchetto personalizzato per il tuo addio al celibato a ${packageRequest.destination.charAt(0).toUpperCase() + packageRequest.destination.slice(1)}! Include volo, alloggio, attività e altro. Clicca sul pulsante "Vedi Pacchetto" per visualizzare i dettagli.`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, packageReadyMessage]);
      
    } catch (error) {
      console.error('Errore nella generazione del pacchetto:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nella generazione del pacchetto",
        variant: "destructive",
      });
      
      // Fallback ai dati di esempio se c'è un errore
      generateFallbackPackage();
    } finally {
      setIsGeneratingPackage(false);
    }
  };

  // Toggle della selezione di un elemento del pacchetto
  const toggleItemSelection = (id: string) => {
    setPackageItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Procedi al checkout del pacchetto
  const proceedToCheckout = () => {
    // Chiudi il dialog del pacchetto
    setShowPackageDialog(false);
    
    // Mostra un messaggio di conferma
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Fantastico! Hai selezionato un pacchetto per un valore totale di €${totalPrice.toFixed(2)}. Procediamo con il pagamento?`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
    
    // Abilita il dialog di checkout dopo un breve ritardo
    setTimeout(() => {
      setCheckoutDialogOpen(true);
    }, 1000);
  };

  // Conferma del checkout
  const confirmCheckout = () => {
    setCheckoutDialogOpen(false);
    
    // In una implementazione reale, qui chiameremmo il servizio di pagamento (Stripe)
    // Per ora simuliamo una conferma
    
    // Aggiungi messaggio di conferma
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Pagamento completato con successo! Riceverai a breve una email con tutti i dettagli della prenotazione. Buon viaggio!`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
    
    // Aggiungi messaggio di follow-up
    setTimeout(() => {
      const followUpMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `C'è qualcos'altro che posso fare per te? Ad esempio, posso suggerirti altre attività nella tua destinazione o aiutarti a organizzare il trasporto dall'aeroporto.`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, followUpMessage]);
    }, 2000);
  };

  // Annulla il checkout
  const cancelCheckout = () => {
    setCheckoutDialogOpen(false);
    
    // Aggiungi messaggio di conferma dell'annullamento
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Nessun problema! Il tuo pacchetto è stato salvato. Puoi completare l'acquisto in qualsiasi momento o modificare le tue selezioni. Hai altre domande?`,
      sender: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
  };

  return (
    <div className="bg-black text-white min-h-screen p-4">
      <Card className="mx-auto max-w-4xl bg-black border-red-600">
        <CardHeader className="border-b border-red-600">
          <CardTitle className="text-red-600 text-xl md:text-2xl flex items-center gap-2">
            <PlusCircle className="h-6 w-6 text-red-600" />
            ByeBro One Click Assistant
          </CardTitle>
          <CardDescription className="text-gray-400">
            Il tuo assistente personale per la pianificazione dell'addio al celibato perfetto
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <ScrollArea className="h-[400px] md:h-[500px] pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  } mb-4`}
                >
                  {message.sender === 'assistant' && (
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/assets/assistant-avatar.png" />
                      <AvatarFallback className="bg-red-600 text-white">BB</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    <p className="text-sm md:text-base">{message.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {message.sender === 'user' && (
                    <Avatar className="h-8 w-8 ml-2">
                      <AvatarImage src="/assets/user-avatar.png" />
                      <AvatarFallback className="bg-gray-600">YOU</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="/assets/assistant-avatar.png" />
                    <AvatarFallback className="bg-red-600 text-white">BB</AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800 rounded-lg px-4 py-3 max-w-[80%]">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            {isGeneratingPackage && (
              <div className="w-full py-3 flex items-center justify-center gap-2 bg-gray-800 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                <p className="text-sm text-gray-300">Sto generando il tuo pacchetto personalizzato...</p>
              </div>
            )}
            
            {messages.length > 4 && !isGeneratingPackage && !showPackageDialog && (
              <div className="flex justify-center">
                <Button 
                  onClick={() => generatePackage()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Genera Pacchetto Personalizzato
                </Button>
              </div>
            )}
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Scrivi un messaggio..."
                  className="bg-gray-800 border-gray-700 focus:border-red-600 text-white"
                  {...form.register('message')}
                  disabled={isLoading || isGeneratingPackage}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || isGeneratingPackage}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
        <CardFooter className="border-t border-red-600 p-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Badge variant="outline" className="border-red-600 text-red-600">
              Assistente AI
            </Badge>
            {selectedDestination && (
              <Badge variant="outline" className="border-gray-600">
                <MapPin className="h-3 w-3 mr-1" />
                {selectedDestination.charAt(0).toUpperCase() + selectedDestination.slice(1)}
              </Badge>
            )}
            {selectedDates.start && (
              <Badge variant="outline" className="border-gray-600">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(selectedDates.start).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Badge>
            )}
            {selectedPeople > 0 && (
              <Badge variant="outline" className="border-gray-600">
                {selectedPeople} persone
              </Badge>
            )}
          </div>
          
          {packageItems.length > 0 && (
            <Button 
              variant="outline" 
              className="border-red-600 text-red-600 hover:bg-red-900"
              onClick={() => setShowPackageDialog(true)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> Vedi Pacchetto
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Dialog per mostrare il pacchetto generato */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="bg-black text-white border border-red-600 max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Il Tuo Pacchetto Personalizzato</DialogTitle>
            <DialogDescription className="text-white">
              Seleziona gli elementi che preferisci per personalizzare il tuo pacchetto
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(80vh-180px)]">
            <div className="space-y-6 p-1">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-gray-900 border-b border-gray-800 mb-4">
                  <TabsTrigger value="all" className="text-white data-[state=active]:text-red-600">Tutto</TabsTrigger>
                  <TabsTrigger value="flights" className="text-white data-[state=active]:text-red-600">Voli</TabsTrigger>
                  <TabsTrigger value="hotels" className="text-white data-[state=active]:text-red-600">Hotel</TabsTrigger>
                  <TabsTrigger value="activities" className="text-white data-[state=active]:text-red-600">Attività</TabsTrigger>
                  <TabsTrigger value="food" className="text-white data-[state=active]:text-red-600">Ristoranti</TabsTrigger>
                  <TabsTrigger value="transport" className="text-white data-[state=active]:text-red-600">Trasporti</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4">
                  {packageItems.map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="flights" className="space-y-4">
                  {packageItems.filter(i => i.type === 'flight').map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="hotels" className="space-y-4">
                  {packageItems.filter(i => i.type === 'hotel').map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="activities" className="space-y-4">
                  {packageItems.filter(i => i.type === 'activity').map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="food" className="space-y-4">
                  {packageItems.filter(i => i.type === 'restaurant').map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
                
                <TabsContent value="transport" className="space-y-4">
                  {packageItems.filter(i => i.type === 'transport').map((item) => (
                    <PackageItemCard 
                      key={item.id} 
                      item={item} 
                      onToggle={toggleItemSelection} 
                    />
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
          
          <div className="border-t border-gray-800 pt-4 flex flex-wrap justify-between items-center gap-2">
            <div className="text-lg font-bold">
              Totale: <span className="text-red-600">€{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
                Annulla
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={proceedToCheckout}>
                Procedi al Checkout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per il checkout */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="bg-black text-white border border-red-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Conferma il tuo acquisto</DialogTitle>
            <DialogDescription className="text-white">
              Sei pronto per acquistare il pacchetto selezionato?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-gray-900 p-4 rounded-md">
              <h4 className="font-bold mb-2 text-white">Riepilogo dell'ordine</h4>
              <div className="space-y-2">
                {packageItems.filter(item => item.selected).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-white">{item.title}</span>
                    <span className="text-red-600">€{item.price.toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="my-2 bg-gray-700" />
                <div className="flex justify-between font-bold">
                  <span className="text-white">Totale</span>
                  <span className="text-red-600">€{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-white">
              Cliccando su "Conferma Acquisto", verrai reindirizzato alla pagina di pagamento dove potrai inserire i dettagli della tua carta di credito.
            </p>
          </div>
          
          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={cancelCheckout}>
              Annulla
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmCheckout}>
              Conferma Acquisto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PackageItemCardProps {
  item: PackageItem;
  onToggle: (id: string) => void;
}

function PackageItemCard({ item, onToggle }: PackageItemCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-5 w-5 text-red-600" />;
      case 'hotel':
        return <Building className="h-5 w-5 text-blue-500" />;
      case 'restaurant':
        return <Utensils className="h-5 w-5 text-yellow-500" />;
      case 'activity':
        return <Music className="h-5 w-5 text-green-500" />;
      case 'transport':
        return <Car className="h-5 w-5 text-purple-500" />;
      case 'event':
        return <Calendar className="h-5 w-5 text-pink-500" />;
      default:
        return <Gift className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <Card className={`bg-gray-900 border ${
      item.selected ? 'border-red-600' : 'border-gray-700'
    } transition-all hover:border-red-500`}>
      <CardContent className="p-0 flex flex-col md:flex-row overflow-hidden">
        <div className="md:w-1/4 h-48 md:h-auto relative">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded-full p-1">
            {getIcon(item.type)}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{item.title}</h3>
              {item.rating && (
                <div className="flex items-center text-yellow-500 text-sm">
                  {'★'.repeat(Math.round(parseFloat(item.rating)))}
                  <span className="text-gray-300 ml-1">({item.rating})</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-red-600 font-bold">€{item.price.toFixed(2)}</div>
              {item.type === 'hotel' && <div className="text-sm text-gray-400">per notte</div>}
            </div>
          </div>
          
          <p className="text-gray-300 text-sm flex-1">{item.description}</p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {item.location && (
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700">
                <MapPin className="h-3 w-3 mr-1" /> {item.location}
              </Badge>
            )}
            {item.duration && (
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700">
                <Clock className="h-3 w-3 mr-1" /> {item.duration}
              </Badge>
            )}
            {item.date && (
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700">
                <Calendar className="h-3 w-3 mr-1" /> {item.date}
              </Badge>
            )}
          </div>
          
          <Button
            variant={item.selected ? "default" : "outline"}
            className={`mt-3 ${
              item.selected 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "border-red-600 text-red-600 hover:bg-red-900"
            }`}
            onClick={() => onToggle(item.id)}
          >
            {item.selected ? "Selezionato" : "Aggiungi al pacchetto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}