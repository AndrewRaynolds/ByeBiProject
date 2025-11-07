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
                
                // Update message in real-time
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: accumulatedContent }
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
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: assistantResponse,
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

  // Function to extract trip details from user messages
  const extractTripDetails = (message: string) => {
    const normalizedMessage = message.toLowerCase();
    let detailsUpdated = false;
    
    // Extract number of people - improved regex patterns
    const peopleMatch = normalizedMessage.match(/(\d+)\s*(person|amici|partecipanti|gente|ragazzi|siamo|persone)/i) || 
                       normalizedMessage.match(/siamo\s*(\d+)/i) || 
                       normalizedMessage.match(/(\d+)/);
    if (peopleMatch && conversationState.currentStep === 'people') {
      const peopleCount = parseInt(peopleMatch[1] || peopleMatch[0]);
      if (peopleCount > 0 && peopleCount <= 50) {
        setTripDetails(prev => ({ ...prev, people: peopleCount }));
        detailsUpdated = true;
      }
    }
    
    // Extract number of days - improved regex patterns
    const daysMatch = normalizedMessage.match(/(\d+)\s*(giorni|day|giorno)/i) || 
                     (conversationState.currentStep === 'days' && normalizedMessage.match(/(\d+)/));
    if (daysMatch && conversationState.currentStep === 'days') {
      const daysCount = parseInt(daysMatch[1] || daysMatch[0]);
      if (daysCount > 0 && daysCount <= 30) {
        setTripDetails(prev => ({ ...prev, days: daysCount }));
        detailsUpdated = true;
      }
    }
    
    // Extract adventure type - improved matching
    if (conversationState.currentStep === 'adventure') {
      if (normalizedMessage.includes('relax') || normalizedMessage.includes('moderato') || normalizedMessage.includes('1')) {
        setTripDetails(prev => ({ ...prev, adventureType: 'relax' }));
        detailsUpdated = true;
      } else if (normalizedMessage.includes('party') || normalizedMessage.includes('intenso') || normalizedMessage.includes('vita notturna') || normalizedMessage.includes('2')) {
        setTripDetails(prev => ({ ...prev, adventureType: 'party' }));
        detailsUpdated = true;
      } else if (normalizedMessage.includes('mix') || normalizedMessage.includes('cultura') || normalizedMessage.includes('cibo') || normalizedMessage.includes('3')) {
        setTripDetails(prev => ({ ...prev, adventureType: 'mix' }));
        detailsUpdated = true;
      } else if (normalizedMessage.includes('lusso') || normalizedMessage.includes('senza limiti') || normalizedMessage.includes('4')) {
        setTripDetails(prev => ({ ...prev, adventureType: 'luxury' }));
        detailsUpdated = true;
      }
    }
    
    return detailsUpdated;
  };

  // Generate personalized itinerary for Ibiza
  const generateIbizaItinerary = (details: any) => {
    const { people, days, adventureType } = details;
    
    const itinerary = {
      title: `Itinerario Ibiza - ${days} giorni per ${people} persone`,
      subtitle: `Addio al celibato ${adventureType === 'party' ? 'Party Intenso' : 
                adventureType === 'luxury' ? 'Lusso Totale' : 
                adventureType === 'mix' ? 'Mix Perfetto' : 'Relax & Fun'}`,
      days: [] as any[]
    };

    for (let day = 1; day <= Math.min(days, 5); day++) {
      let dayPlan: any = {
        day: day,
        title: `Giorno ${day}`,
        activities: []
      };

      if (day === 1) {
        dayPlan.title = "Arrivo e Prima Serata";
        dayPlan.activities = [
          { time: "15:00", type: "arrival", title: "Arrivo a Ibiza", description: "Check-in hotel e sistemazione" },
          { time: "19:00", type: "restaurant", title: adventureType === 'luxury' ? "La Gaia" : "Amante Beach", 
            description: adventureType === 'luxury' ? "Cena stellata con vista mare (€185/persona)" : "Aperitivo e cena vista mare (€65/persona)" },
          { time: "23:30", type: "nightlife", title: "Pacha Ibiza", 
            description: `Prima notte al club più iconico! Ingresso €65 + drink €15-20 caduno` }
        ];
      } else if (day === 2) {
        dayPlan.title = "Beach Day & Club Night";
        dayPlan.activities = [
          { time: "11:00", type: "activity", title: "Boat Party", description: "Festa in barca con DJ e open bar (€90/persona)" },
          { time: "18:00", type: "restaurant", title: adventureType === 'party' ? "Tapas locali" : "Es Mercat", 
            description: adventureType === 'party' ? "Pre-drink e tapas (€25/persona)" : "Cena tradizionale ibicenca (€45/persona)" },
          { time: "01:00", type: "nightlife", title: adventureType === 'luxury' ? "Hï Ibiza VIP" : "Amnesia", 
            description: adventureType === 'luxury' ? "Tavolo VIP esperienza totale (€450/persona)" : "Notte al club leggendario (€65/persona)" }
        ];
      } else if (day === 3 && days >= 3) {
        dayPlan.title = "Esplorazione & Sunset";
        dayPlan.activities = [
          { time: "14:00", type: "activity", title: "Tour dell'isola", description: "Visita Dalt Vila e spiagge nascoste" },
          { time: "19:00", type: "restaurant", title: adventureType === 'luxury' ? "Es Tragón Michelin" : "Ca N'Alfredo", 
            description: adventureType === 'luxury' ? "Esperienza stellata Michelin (€220/persona)" : "Autentica cucina locale (€55/persona)" },
          { time: "22:00", type: "activity", title: "Sunset Strip", description: "Aperitivi vista tramonto a San Antonio" },
          { time: "01:30", type: "nightlife", title: "DC10 Circoloco", description: "Underground techno experience (€75/persona)" }
        ];
      }

      if (day <= days) {
        (itinerary.days as any[]).push(dayPlan);
      }
    }

    return itinerary;
  };

  // Check if we have enough details to generate itinerary
  const checkAndGenerateItinerary = () => {
    if (selectedDestination === 'ibiza' && tripDetails.people > 0 && tripDetails.days > 0 && tripDetails.adventureType) {
      setTimeout(() => {
        const itinerary = generateIbizaItinerary(tripDetails);
        setItineraryData(itinerary);
        setShowItineraryDialog(true);
        
        const confirmMessage: ChatMessage = {
          id: (Date.now() + 3).toString(),
          content: "Perfetto! Ho creato il vostro itinerario personalizzato per Ibiza. Controllate tutti i dettagli giorno per giorno!",
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      }, 1500);
      
      return "Sto creando il vostro itinerario personalizzato per Ibiza... Un momento! 🔥";
    }
    return null;
  };

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
        "ECCELLENTE! Cracovia = budget friendly + storia + vita notturna! L'addio al celibato intelligente! Quanti partecipanti? Periodo?"
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
      setTripDetails({ people: 0, days: 0, startDate: '', endDate: '', adventureType: '', interests: [], budget: 'medio' });
      setConversationState({
        askedForPeople: false,
        askedForDays: false,
        askedForAdventure: false,
        currentStep: 'people'
      });
      return "IBIZA! La destinazione PERFETTA per un addio al celibato! 🏖️\n\nPer crearvi un itinerario personalizzato perfetto, iniziamo con la prima domanda:\n\nQuante persone siete?";
    } else if (
      (normalizedMessage.includes('date') || 
       normalizedMessage.includes('quando') || 
       normalizedMessage.includes('giorno')) &&
      selectedDestination !== 'ibiza'
    ) {
      const dateResponses = [
        "Perfetto! E quante persone parteciperanno al viaggio? Così posso consigliarti le migliori opzioni per alloggi e attività.",
        "Ottimo! Ora dimmi: quanti amici si uniscono all'avventura? In base al numero posso personalizzare tutto!",
        "Grande! E il gruppo quanto è numeroso? Voglio creare qualcosa di perfetto per tutti voi!",
        "Perfetto per quelle date! Quanti siete in totale? Così organizzo tutto nei dettagli!"
      ];
      return dateResponses[Math.floor(Math.random() * dateResponses.length)];
    } else if (
      (normalizedMessage.includes('person') || 
       normalizedMessage.includes('amici') || 
       normalizedMessage.includes('partecipanti') || 
       normalizedMessage.includes('gruppo')) &&
      selectedDestination !== 'ibiza'
    ) {
      const peopleResponses = [
        "Ottimo! Ti interessano più attività rilassanti o preferisci un'esperienza più movimentata? Hai interessi particolari come sport, degustazioni, esperienze culturali?",
        "Perfetto per quel numero! Ora dimmi: volete un'avventura tranquilla o totale follia? Club, ristoranti gourmet, attività adrenaliniche?",
        "Grande gruppo! Che tipo di esperienza cercate? Relax e cultura, vita notturna sfrenata, mix di tutto, o qualcos'altro di specifico?",
        "Fantastico! E ora: siete più tipi da serate pazze nei club o preferite esperienze esclusive? Attività particolari in mente?"
      ];
      return peopleResponses[Math.floor(Math.random() * peopleResponses.length)];
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
      normalizedMessage.includes('proposta') ||
      normalizedMessage.includes('itinerario')
    ) {
      // Check if we can generate itinerary for Ibiza
      const itineraryResponse = checkAndGenerateItinerary();
      if (itineraryResponse) {
        return itineraryResponse;
      }
      
      // Otherwise generate package
      setTimeout(() => {
        generatePackage();
      }, 1000);
      return "Sto generando un pacchetto personalizzato in base alle tue preferenze. Dammi solo un momento...";
    }
    
    // Check if we can auto-generate itinerary based on collected details
    const autoItineraryResponse = checkAndGenerateItinerary();
    if (autoItineraryResponse) {
      return autoItineraryResponse;
    }
    
    // Handle Ibiza conversation flow
    if (selectedDestination === 'ibiza') {
      // Check if details were just updated and advance the conversation
      if (detailsUpdated) {
        // Move to next step based on what was just collected
        if (conversationState.currentStep === 'people' && tripDetails.people > 0) {
          setTimeout(() => {
            setConversationState(prev => ({ ...prev, askedForPeople: true, currentStep: 'days' }));
          }, 100);
          return `Perfetto! Siete ${tripDetails.people} persone. Per quanti giorni partite?`;
        } else if (conversationState.currentStep === 'days' && tripDetails.days > 0) {
          setTimeout(() => {
            setConversationState(prev => ({ ...prev, askedForDays: true, currentStep: 'adventure' }));
          }, 100);
          return `Ottimo! ${tripDetails.days} giorni saranno fantastici! Che tipo di avventura cercate?\n\n1. Relax e divertimento moderato\n2. Party intenso e vita notturna\n3. Mix di cultura, cibo e festa\n4. Lusso totale senza limiti\n\nScrivete il numero o il tipo!`;
        } else if (conversationState.currentStep === 'adventure' && tripDetails.adventureType) {
          setTimeout(() => {
            setConversationState(prev => ({ ...prev, askedForAdventure: true, currentStep: 'complete' }));
          }, 100);
          // Auto-generate itinerary when all details are collected
          const itineraryResponse = checkAndGenerateItinerary();
          if (itineraryResponse) {
            return itineraryResponse;
          }
        }
      }
      
      // Fallback responses for incomplete information with variety
      if (conversationState.currentStep === 'people' && tripDetails.people === 0) {
        const peoplePrompts = [
          "Perfetto! Dimmi solo: quante persone siete? (scrivi solo il numero)",
          "Fantastico! Ora dimmi il numero esatto di partecipanti:",
          "Grande! Quanti amici partecipano all'avventura? (solo il numero)",
          "Ottimo! Il gruppo quanto è numeroso? Dimmi il numero!"
        ];
        return peoplePrompts[Math.floor(Math.random() * peoplePrompts.length)];
      } else if (conversationState.currentStep === 'days' && tripDetails.days === 0) {
        const dayPrompts = [
          "Dimmi per quanti giorni partite! (scrivi solo il numero)",
          "Perfetto! Quanti giorni volete restare a Ibiza?",
          "Fantastico! Durata del viaggio? Quanti giorni?",
          "Grande! Per quanto tempo conquistate Ibiza?"
        ];
        return dayPrompts[Math.floor(Math.random() * dayPrompts.length)];
      } else if (conversationState.currentStep === 'adventure' && !tripDetails.adventureType) {
        const adventurePrompts = [
          "Scegli il tipo di avventura:\n\n1. Relax e divertimento moderato\n2. Party intenso e vita notturna\n3. Mix di cultura, cibo e festa\n4. Lusso totale senza limiti\n\nScrivi il numero o il tipo!",
          "Che esperienza volete vivere?\n\n1. Chill e divertimento tranquillo\n2. Follia totale e club\n3. Mix perfetto di tutto\n4. Lusso senza compromessi\n\nDimmi il numero!",
          "Quale vibe cercate?\n\n1. Relax con un po' di festa\n2. Party hard senza fine\n3. Cultura, cibo e divertimento\n4. Esperienza VIP esclusiva\n\nScegli!"
        ];
        return adventurePrompts[Math.floor(Math.random() * adventurePrompts.length)];
      }
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
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              ByeBro Chat Assistant
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
                          message.sender === 'assistant' ? 'bg-red-600' : 'bg-gray-600'
                        }`}>
                          {message.sender === 'assistant' ? 'BB' : (user?.username?.[0]?.toUpperCase() || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div
                        className={`rounded-lg px-4 py-2 break-words ${
                          message.sender === 'user'
                            ? 'bg-red-600 text-white'
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
            <div className="border-t pt-4">
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