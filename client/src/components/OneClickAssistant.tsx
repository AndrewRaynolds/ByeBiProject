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
  const [brand, setBrand] = useState<'byebro' | 'byebride'>('byebro');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Ciao! 👋 Dove vuoi andare per il tuo addio al celibato? Dimmi la città e ti creo un pacchetto personalizzato!',
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
  const [showItineraryDialog, setShowItineraryDialog] = useState(false);
  const [itineraryData, setItineraryData] = useState<any>(null);
  const [tripDetails, setTripDetails] = useState({
    people: 0,
    days: 0,
    startDate: '',
    endDate: '',
    adventureType: '',
    interests: [] as string[],
    budget: 'medio' as string
  });
  const [conversationState, setConversationState] = useState({
    askedForPeople: false,
    askedForDays: false,
    askedForAdventure: false,
    currentStep: 'initial' as 'initial' | 'people' | 'days' | 'adventure' | 'complete'
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect current brand from localStorage
  useEffect(() => {
    const savedBrand = localStorage.getItem('selectedBrand') as 'byebro' | 'byebride' | null;
    if (savedBrand) {
      setBrand(savedBrand);
    }
  }, []);

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

  // Check for initial message from hero section
  useEffect(() => {
    const initialMessage = localStorage.getItem('byebro-initial-message');
    if (initialMessage) {
      localStorage.removeItem('byebro-initial-message');
      // Wait a bit for the component to mount
      setTimeout(() => {
        form.setValue('message', initialMessage);
        form.handleSubmit(onSubmit)();
      }, 500);
    }
  }, []);

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

    // Create conversation history for GROQ (last 6 messages)
    const conversationHistory = messages.slice(-6).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    try {
      // Try GROQ streaming first (ultra-fast!)
      const response = await fetch('/api/chat/groq-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: data.message,
          selectedDestination,
          tripDetails,
          conversationHistory
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('GROQ streaming not available');
      }

      // Create a placeholder message for streaming
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              
              if (jsonData.error) {
                throw new Error(jsonData.error);
              }
              
              if (jsonData.done) {
                // Streaming complete
                break;
              }
              
              if (jsonData.content) {
                accumulatedContent += jsonData.content;
                
                // Parse directives and update state
                const cleanedContent = parseDirectives(accumulatedContent);
                
                // Update message in real-time with cleaned content (no directives)
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: cleanedContent }
                    : msg
                ));
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

      // Extract trip details from response if needed
      extractTripDetails(data.message);

    } catch (error) {
      // Fallback to local response generation
      console.log("GROQ not available, using fallback:", error);
      
      const assistantResponse = generateResponse(data.message);
      
      // Clean directives from fallback response too
      const cleanedResponse = parseDirectives(assistantResponse);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: cleanedResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => {
        // Remove any empty streaming message
        const filtered = prev.filter(msg => msg.content !== '');
        return [...filtered, assistantMessage];
      });
      setIsLoading(false);
    }
  };

  // Parse AI directives from response
  const parseDirectives = (content: string) => {
    const directiveRegex = /\[([A-Z_]+):([^\]]+)\]/g;
    let match;
    
    while ((match = directiveRegex.exec(content)) !== null) {
      const [, command, value] = match;
      
      switch (command) {
        case 'SET_DESTINATION':
          setSelectedDestination(value.trim().toLowerCase());
          break;
          
        case 'SET_DATES':
          const [startDate, endDate] = value.split(',').map(d => d.trim());
          setTripDetails(prev => ({ ...prev, startDate, endDate }));
          // Calculate days
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            setTripDetails(prev => ({ ...prev, days }));
          }
          break;
          
        case 'SET_PARTICIPANTS':
          const participants = parseInt(value);
          if (!isNaN(participants)) {
            setTripDetails(prev => ({ ...prev, people: participants }));
          }
          break;
          
        case 'SET_EVENT_TYPE':
          setTripDetails(prev => ({ ...prev, adventureType: value.trim() }));
          break;
          
        case 'SHOW_EXPERIENCES':
          // Store experiences for display
          const experiences = value.split('|').map(exp => exp.trim());
          setTripDetails(prev => ({ ...prev, interests: experiences }));
          break;
          
        case 'UNLOCK_ITINERARY_BUTTON':
          // Signal that itinerary can be generated
          setConversationState(prev => ({ ...prev, currentStep: 'complete' }));
          break;
      }
    }
    
    // Remove directives from visible content
    return content.replace(directiveRegex, '').trim();
  };

  // Function to extract trip details from user messages (deprecated - now using AI directives)
  const extractTripDetails = (message: string) => {
    // This function is now mainly for fallback when GROQ is not available
    const normalizedMessage = message.toLowerCase();
    let detailsUpdated = false;
    
    // Extract number of people
    const peopleMatch = normalizedMessage.match(/(\d+)\s*(person|amici|partecipanti|gente|ragazzi|siamo|persone)/i);
    if (peopleMatch) {
      const peopleCount = parseInt(peopleMatch[1]);
      if (peopleCount > 0 && peopleCount <= 50) {
        setTripDetails(prev => ({ ...prev, people: peopleCount }));
        detailsUpdated = true;
      }
    }
    
    // Extract number of days
    const daysMatch = normalizedMessage.match(/(\d+)\s*(giorni|day|giorno)/i);
    if (daysMatch) {
      const daysCount = parseInt(daysMatch[1]);
      if (daysCount > 0 && daysCount <= 30) {
        setTripDetails(prev => ({ ...prev, days: daysCount }));
        detailsUpdated = true;
      }
    }
    
    return detailsUpdated;
  };

  // REMOVED: generateIbizaItinerary and checkAndGenerateItinerary
  // Now using AI directives system - all logic handled by GROQ prompts

  // Varie risposte per evitare ripetizioni
  const getVariedResponses = (destinationName: string, destinationKey: string) => {
    const responses = {
      amsterdam: [
        "Amsterdam! Fantastica scelta! 🍺 Canali romantici di giorno, follia totale di notte! Quanti siete? E per quanto tempo volete conquistare la città?",
        "AMSTERDAM! Red Light District, coffee shops e vita notturna leggendaria! Dimmi: il gruppo è numeroso? Quando pensate di partire?",
        "Amsterdam è PERFETTA per un addio al celibato! Birra a fiumi, club fantastici e un'atmosfera unica! Siete un gruppo grande? Che periodo avete in mente?"
      ],
      praga: [
        "PRAGA! Birra buonissima e prezzi da sogno! 🍻 La combo perfetta per un addio al celibato! Quanti amici si uniscono? Quale weekend preferite?",
        "Praga è una BOMBA per l'addio al celibato! Castelli da favola di giorno, locali pazzeschi di notte! Dimmi del gruppo: quanti partecipanti? Date in mente?",
        "ECCELLENTE scelta Praga! Birra a 1€, club fantastici e tutto spettacolare! Il budget ringrazierà! Quante persone? Quando volete scatenarvi?"
      ],
      budapest: [
        "BUDAPEST! Bagni termali per il relax, ruin bar per la follia! 🛁🍻 Perfetto mix! Quanti brave warriors? Quando conquistate la città?",
        "Budapest è magica! Terme di giorno, locali underground di notte! Un addio al celibato leggendario! Gruppo numeroso? Che periodo?",
        "FANTASTICO! Budapest = terme + ruin bar + prezzi ottimi! Addio al celibato da SOGNO! Dimmi: quanti partecipanti? Date preferite?"
      ],
      barcellona: [
        "BARCELLONA! Spiagge, tapas e vita notturna pazzesca! 🏖️🌮 La combo vincente! Quanti amici? Quando pensate di conquistare la città catalana?",
        "Barcellona è PERFETTA! Mare di giorno, locali di notte, cibo spettacolare sempre! Dimmi del gruppo: quanti siete? Periodo in mente?",
        "ECCELLENTE! Barcellona = spiagge + festa + cultura! Un mix esplosivo per l'addio al celibato! Gruppo grande? Date favorite?"
      ],
      berlino: [
        "BERLINO! Club underground fino all'alba! 🎵 La capitale europea della vita notturna! Quanti party animals? Quando invadete la città?",
        "Berlino è LEGGENDARIA! Techno, club aperti 48h, esperienze uniche! Perfetto per un addio memorabile! Gruppo numeroso? Che weekend?",
        "BOMBA! Berlino = club senza fine + cultura alternativa! Un addio al celibato da FILM! Dimmi: quanti partecipanti? Date in mente?"
      ],
      roma: [
        "ROMA! La Città Eterna per un addio al celibato epico! 🏛️🍕 Storia, cibo e vita notturna! Quanti gladiatori moderni? Quando conquistate l'impero?",
        "Roma è SPETTACOLARE! Colosseo di giorno, aperitivi a Trastevere di sera! Un mix perfetto! Gruppo grande? Periodo preferito?",
        "FANTASTICO! Roma = storia + cibo incredibile + locali fantastici! Addio al celibato da imperatori! Quanti amici? Quale weekend?"
      ],
      lisbona: [
        "LISBONA! Fascino costiero e vita notturna autentica! 🌊🍷 Una gemma nascosta! Quanti avventurieri? Quando esplorate il Portogallo?",
        "Lisbona è una SCOPERTA! Fado, vino e locali caratteristici! Perfetta per un addio originale! Dimmi del gruppo: quanti siete?",
        "ECCELLENTE! Lisbona = fascino + autenticità + prezzi ottimi! Un addio al celibato diverso dal solito! Gruppo numeroso? Date?"
      ],
      "palma de mallorca": [
        "PALMA DE MALLORCA! Beach club paradisiaci e acque cristalline! 🏖️🍹 Il sogno mediterraneo! Quanti beach lovers? Quando in paradiso?",
        "Palma è PERFETTA! Spiagge da sogno, yacht party e vita notturna con vista mare! Dimmi: quanti amici? Periodo ideale?",
        "BOMBA! Palma = spiagge + beach club + atmosfera esclusiva! Un addio al celibato VIP! Gruppo grande? Quando partite?"
      ],
      cracovia: [
        "CRACOVIA! Prezzi imbattibili e centro storico da favola! 💰🏰 Il massimo risparmio, il massimo divertimento! Quanti? Date?",
        "Cracovia è GENIALE! Spendi poco, ti diverti tanto! Centro UNESCO e locali fantastici! Gruppo numeroso? Quando conquistate la Polonia?",
        "ECCELLENTE! Cracovia = budget friendly + storia + vita notturna! L'addio al celibato intelligente! Quanti partecipanti! Periodo?"
      ],
      ibiza: [
        "Ibiza! Dimmi la destinazione esatta che hai scelto e ti aiuterò a organizzare il tuo addio. Quante persone partecipano e quando partite?",
        "Perfetto! Ibiza è una grande scelta. Fammi sapere: quanti siete e in quali date pensate di partire?",
        "Ibiza interessante! Per aiutarti al meglio, dimmi: quante persone e quali sono le date del viaggio?"
      ]
    };
    
    const destinationResponses = responses[destinationKey as keyof typeof responses] || responses.roma;
    return destinationResponses[Math.floor(Math.random() * destinationResponses.length)];
  };

  // Simulazione delle risposte dell'assistente (in un'implementazione reale utilizzerebbe OpenAI)
  const generateResponse = (userMessage: string): string => {
    const normalizedMessage = userMessage.toLowerCase();
    
    // Extract trip details from user message
    const detailsUpdated = extractTripDetails(userMessage);
    
    if (normalizedMessage.includes('amsterdam') || normalizedMessage.includes('olanda')) {
      setSelectedDestination('amsterdam');
      return getVariedResponses('Amsterdam', 'amsterdam');
    } else if (normalizedMessage.includes('praga') || normalizedMessage.includes('repubblica ceca')) {
      setSelectedDestination('praga');
      return getVariedResponses('Praga', 'praga');
    } else if (normalizedMessage.includes('budapest') || normalizedMessage.includes('ungheria')) {
      setSelectedDestination('budapest');
      return getVariedResponses('Budapest', 'budapest');
    } else if (normalizedMessage.includes('barcellona') || normalizedMessage.includes('spagna')) {
      setSelectedDestination('barcellona');
      return getVariedResponses('Barcellona', 'barcellona');
    } else if (normalizedMessage.includes('berlino') || normalizedMessage.includes('germania')) {
      setSelectedDestination('berlino');
      return getVariedResponses('Berlino', 'berlino');
    } else if (normalizedMessage.includes('roma') || normalizedMessage.includes('italia')) {
      setSelectedDestination('roma');
      return getVariedResponses('Roma', 'roma');
    } else if (normalizedMessage.includes('lisbona') || normalizedMessage.includes('portogallo')) {
      setSelectedDestination('lisbona');
      return getVariedResponses('Lisbona', 'lisbona');
    } else if (normalizedMessage.includes('palma') || normalizedMessage.includes('mallorca')) {
      setSelectedDestination('palma de mallorca');
      return getVariedResponses('Palma de Mallorca', 'palma de mallorca');
    } else if (normalizedMessage.includes('cracovia') || normalizedMessage.includes('polonia')) {
      setSelectedDestination('cracovia');
      return getVariedResponses('Cracovia', 'cracovia');
    } else if (normalizedMessage.includes('ibiza')) {
      setSelectedDestination('ibiza');
      return getVariedResponses('Ibiza', 'ibiza');
    }
    
    // Varied final responses
    const finalResponses = [
      "Grazie per queste informazioni! Hai altre preferenze o richieste particolari per il tuo addio al celibato?",
      "Perfetto! C'è qualcos'altro che vorresti aggiungere per rendere questo viaggio indimenticabile?",
      "Fantastico! Dimmi se hai altri desideri speciali per questo addio al celibato epico!",
      "Ottimo! Altre preferenze particolari che dovrei considerare per il vostro viaggio?",
      "Grande! Hai richieste speciali o attività particolari in mente?"
    ];
    
    return finalResponses[Math.floor(Math.random() * finalResponses.length)];
  };

  // Genera un pacchetto con opzioni per volo, hotel, ristoranti e attività
  const generatePackage = async () => {
    setIsGeneratingPackage(true);
    
    try {
      // Prepara i dati per la chiamata a Zapier
      const zapierData = {
        citta: selectedDestination || 'Roma',
        date: {
          startDate: tripDetails.startDate || new Date().toISOString().split('T')[0],
          endDate: tripDetails.endDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        persone: tripDetails.people || 4,
        interessi: tripDetails.interests || [],
        budget: tripDetails.budget || 'medio',
        esperienze: tripDetails.adventureType ? [tripDetails.adventureType] : []
      };

      // Chiama la route Zapier per generare l'itinerario AI
      const response = await apiRequest('POST', '/api/generate-itinerary', zapierData);
      const result = await response.json();

      if (result.success) {
        // Mostra messaggio di successo
        const aiMessage: ChatMessage = {
          id: (Date.now() + 4).toString(),
          content: `🎉 ${result.message}\n\n${result.aiContent}`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Salva l'itinerario generato
        setItineraryData({
          title: result.itinerary.name,
          subtitle: result.itinerary.description,
          days: []
        });
        
        toast({
          title: "Itinerario Generato",
          description: result.zapierProcessed ? "Itinerario creato con AI" : "Itinerario in elaborazione",
        });
      } else {
        throw new Error('Errore nella generazione');
      }
    } catch (error) {
      // Fallback alla generazione locale
      console.log("Fallback to local generation");
      
      toast({
        title: "Connessione Zapier",
        description: "Utilizzo generazione locale come fallback",
        variant: "default",
      });
    }
    
    // Simulazione locale di generazione pacchetto
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
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
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
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
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
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
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
            title: 'Volo diretto per Roma',
            description: 'Volo diretto da Milano a Roma Fiumicino, andata e ritorno',
            price: 129.99,
            imageUrl: 'https://images.unsplash.com/photo-1507812984078-917a274065be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            date: '15 Giugno 2025',
            duration: '1h 20min',
            selected: true
          },
          {
            id: '2',
            type: 'hotel',
            title: 'Hotel Artemide Roma',
            description: 'Hotel 4 stelle nel centro di Roma, vicino alla Stazione Termini',
            price: 89.99,
            imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Centro di Roma',
            rating: '4.5',
            selected: true
          },
          {
            id: '3',
            type: 'hotel',
            title: 'Hotel Hassler Roma',
            description: 'Hotel di lusso con vista sulla Scalinata di Trinità dei Monti',
            price: 249.99,
            imageUrl: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80',
            location: 'Piazza di Spagna',
            rating: '4.9',
            selected: false
          },
          {
            id: '4',
            type: 'restaurant',
            title: 'Da Enzo al 29',
            description: 'Autentica trattoria romana nel cuore di Trastevere',
            price: 35.99,
            imageUrl: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
            location: 'Trastevere',
            rating: '4.7',
            selected: true
          },
          {
            id: '5',
            type: 'activity',
            title: 'Tour del Colosseo e Fori Imperiali',
            description: 'Visita guidata con accesso prioritario ai monumenti antichi',
            price: 45.99,
            imageUrl: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Centro Storico',
            duration: '3 ore',
            selected: true
          },
          {
            id: '6',
            type: 'activity',
            title: 'Aperitivo Tour a Trastevere',
            description: 'Tour dei migliori bar per aperitivo nel quartiere più trendy',
            price: 29.99,
            imageUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
            location: 'Trastevere',
            duration: '2.5 ore',
            selected: true
          },
          {
            id: '7',
            type: 'activity',
            title: 'Musei Vaticani e Cappella Sistina',
            description: 'Visita esclusiva ai tesori del Vaticano',
            price: 55.99,
            imageUrl: 'https://images.unsplash.com/photo-1529973625058-a665431328fb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1887&q=80',
            location: 'Città del Vaticano',
            duration: '4 ore',
            selected: false
          },
          {
            id: '8',
            type: 'transport',
            title: 'Roma Pass 3 giorni',
            description: 'Trasporto pubblico illimitato + accesso ai musei',
            price: 38.99,
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

  const handleGenerateItinerary = async () => {
    if (!selectedDestination || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.people || !tripDetails.eventType) {
      toast({
        title: "Dati mancanti",
        description: "Completa tutte le informazioni richieste prima di generare l'itinerario.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPackage(true);

    try {
      const response = await apiRequest('POST', '/api/generated-itineraries', {
        destination: selectedDestination,
        startDate: tripDetails.startDate,
        endDate: tripDetails.endDate,
        participants: tripDetails.people,
        eventType: tripDetails.eventType,
        selectedExperiences: tripDetails.interests
      });

      if (!response.ok) {
        throw new Error('Failed to generate itinerary');
      }

      const itinerary = await response.json();
      
      toast({
        title: "Itinerario generato!",
        description: "Il tuo itinerario personalizzato è pronto.",
      });

      // Navigate to itinerary page with the generated ID
      window.location.href = `/itinerary/${itinerary.id}`;
      
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione dell'itinerario. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPackage(false);
    }
  };

  const brandColors = {
    primary: brand === 'byebro' ? 'bg-red-600' : 'bg-pink-600',
    primaryText: brand === 'byebro' ? 'text-red-600' : 'text-pink-600',
    primaryHover: brand === 'byebro' ? 'hover:bg-red-700' : 'hover:bg-pink-700',
  };
  
  const brandName = brand === 'byebro' ? 'ByeBro' : 'ByeBride';
  const eventType = brand === 'byebro' ? 'addio al celibato' : 'addio al nubilato';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${brandColors.primary} rounded-full flex items-center justify-center`}>
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">One Click Assistant</h1>
              <p className="text-sm text-gray-500">Il tuo assistente personale per l'{eventType} perfetto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 container mx-auto max-w-4xl p-4">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              {brandName} Chat Assistant
            </CardTitle>
            <CardDescription className="text-sm">
              {selectedDestination === 'ibiza' 
                ? `Ibiza - ${tripDetails.people > 0 ? `${tripDetails.people} persone` : 'Raccolta info'} ${tripDetails.days > 0 ? `• ${tripDetails.days} giorni` : ''} ${tripDetails.adventureType ? `• ${tripDetails.adventureType}` : ''}`
                : 'Dimmi dove vuoi andare per il tuo addio al celibato!'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="flex-1 pr-2 mb-4">
              <div className="space-y-4 p-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={`text-white text-xs ${
                          message.sender === 'assistant' ? brandColors.primary : 'bg-gray-600'
                        }`}>
                          {message.sender === 'assistant' ? (brand === 'byebro' ? 'BB' : 'BD') : (user?.username?.[0]?.toUpperCase() || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div
                        className={`rounded-lg px-4 py-2 break-words ${
                          message.sender === 'user'
                            ? `${brandColors.primary} text-white`
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={`${brandColors.primary} text-white text-xs`}>
                          {brand === 'byebro' ? 'BB' : 'BD'}
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
            <div className="border-t pt-4 space-y-2">
              {/* Show "Genera Itinerario" button when conversation is complete */}
              {conversationState.currentStep === 'complete' && tripDetails.interests.length > 0 && (
                <Button 
                  onClick={handleGenerateItinerary}
                  className={`w-full ${brandColors.primary} ${brandColors.primaryHover} text-white`}
                  disabled={isGeneratingPackage}
                  data-testid="button-generate-itinerary"
                >
                  {isGeneratingPackage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Genera Itinerario Completo
                    </>
                  )}
                </Button>
              )}
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                <Input
                  {...form.register('message')}
                  placeholder="Scrivi qui il tuo messaggio..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} className="flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
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

      {/* Itinerary Dialog */}
      <Dialog open={showItineraryDialog} onOpenChange={setShowItineraryDialog}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-lg -m-6 mb-4">
            <DialogTitle className="text-2xl font-bold">
              {itineraryData?.title || "Il Vostro Itinerario"}
            </DialogTitle>
            <DialogDescription className="text-red-100 text-lg">
              {itineraryData?.subtitle || "Addio al celibato personalizzato"}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {itineraryData?.days?.map((day: any, index: number) => (
                <div key={index} className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                    <h3 className="text-xl font-bold text-red-800">
                      {day.title}
                    </h3>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {day.activities?.map((activity: any, actIndex: number) => (
                      <div key={actIndex} className="flex gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                            {activity.time}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {activity.type === 'restaurant' && <Utensils className="w-5 h-5 text-red-600" />}
                            {activity.type === 'nightlife' && <Music className="w-5 h-5 text-red-600" />}
                            {activity.type === 'activity' && <MapPin className="w-5 h-5 text-red-600" />}
                            {activity.type === 'arrival' && <Plane className="w-5 h-5 text-red-600" />}
                            
                            <h4 className="font-bold text-lg text-gray-900">
                              {activity.title}
                            </h4>
                            
                            <Badge 
                              variant={
                                activity.type === 'restaurant' ? 'default' :
                                activity.type === 'nightlife' ? 'destructive' :
                                activity.type === 'activity' ? 'secondary' : 'outline'
                              }
                              className="ml-auto"
                            >
                              {activity.type === 'restaurant' ? 'Ristorante' :
                               activity.type === 'nightlife' ? 'Vita Notturna' :
                               activity.type === 'activity' ? 'Attività' : 'Arrivo'}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-700 leading-relaxed">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-3">Consigli Extra per Ibiza</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Prima di partire:</h4>
                    <ul className="space-y-1 text-red-100">
                      <li>• Prenota ristoranti top in anticipo</li>
                      <li>• Compra biglietti club online (-€10-20)</li>
                      <li>• Scarica app taxi locali</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Durante il viaggio:</h4>
                    <ul className="space-y-1 text-red-100">
                      <li>• Pre-drink prima dei club</li>
                      <li>• Usa guest list quando disponibile</li>
                      <li>• Goditi i tramonti di San Antonio</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="bg-gray-50 -m-6 mt-4 p-6">
            <Button variant="outline" onClick={() => setShowItineraryDialog(false)}>
              Chiudi
            </Button>
            <Button className="bg-red-600 hover:bg-red-700">
              <Calendar className="w-4 h-4 mr-2" />
              Scarica PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}