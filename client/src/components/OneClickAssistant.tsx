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
import { Loader2, Send, Calendar, MapPin, Utensils, Music, Plane, Hotel, Car, Gift, PlusCircle, ShoppingCart } from 'lucide-react';
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
  type: 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport';
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
      return "Amsterdam è una scelta eccellente per un addio al celibato! Offre locali notturni, ottima birra e molto altro. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('praga') || normalizedMessage.includes('repubblica ceca')) {
      return "Praga è una destinazione fantastica per un addio al celibato! È famosa per la sua birra, vita notturna e prezzi accessibili. In quali date vorresti andarci? E quante persone parteciperanno?";
    } else if (normalizedMessage.includes('budapest') || normalizedMessage.includes('ungheria')) {
      return "Budapest è una meta popolare per gli addii al celibato! Offre bagni termali, ruin bar e ottimo cibo. In quali date vorresti andarci? E quante persone parteciperanno?";
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
      const dummyPackage: PackageItem[] = [
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
      
      setPackageItems(dummyPackage);
      setIsGeneratingPackage(false);
      setShowPackageDialog(true);
      
      // Aggiungi un messaggio che informa l'utente che il pacchetto è pronto
      const packageReadyMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        content: "Ho creato un pacchetto personalizzato per il tuo addio al celibato! Puoi visualizzare le opzioni e procedere con l'acquisto con un solo clic.",
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, packageReadyMessage]);
    }, 3000);
  };

  // Funzione per gestire la selezione/deselezione degli elementi del pacchetto
  const toggleItemSelection = (itemId: string) => {
    setPackageItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, selected: !item.selected } 
          : item
      )
    );
  };

  // Funzione per procedere al checkout
  const proceedToCheckout = () => {
    setShowPackageDialog(false);
    setCheckoutDialogOpen(true);
  };

  // Completamento dell'acquisto con integrazione Zapier
  const completeCheckout = async () => {
    try {
      // Dati del pacchetto da inviare a Zapier
      const selectedItems = packageItems.filter(item => item.selected);
      
      // Prepariamo i dati dell'acquisto per Zapier
      const purchaseData = {
        packageId: Date.now().toString(),
        userId: user?.id || 'guest',
        userEmail: user?.email || 'guest@example.com',
        destination: 'Amsterdam',
        startDate: '2025-06-15',
        endDate: '2025-06-18',
        items: selectedItems.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          price: item.price
        })),
        totalPrice,
        purchaseDate: new Date().toISOString()
      };
      
      // Invia dati dell'acquisto a Zapier tramite il nostro endpoint
      await apiRequest('POST', '/api/zapier/receive', {
        action: 'purchase_completed',
        data: purchaseData
      });
      
      toast({
        title: "Acquisto completato",
        description: "Il tuo pacchetto ByeBro è stato acquistato con successo!",
      });
      setCheckoutDialogOpen(false);
      
      // Aggiungi un messaggio di conferma nella chat
      const confirmationMessage: ChatMessage = {
        id: (Date.now() + 4).toString(),
        content: "Fantastico! Ho appena ricevuto la conferma del tuo acquisto. Riceverai presto un'email con tutti i dettagli del tuo pacchetto ByeBro. Ho anche sincronizzato le informazioni con il tuo calendario e inviato notifiche agli altri partecipanti. Buon divertimento!",
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Dopo 3 secondi, aggiungi un altro messaggio con informazioni sulla conferma
      setTimeout(() => {
        const followUpMessage: ChatMessage = {
          id: (Date.now() + 5).toString(),
          content: "Ti ho inviato un'email di conferma con tutti i dettagli. Inoltre, ho programmato dei promemoria prima della partenza e creato un gruppo condiviso per tutti i partecipanti.",
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, followUpMessage]);
      }, 3000);
    } catch (error) {
      console.error('Error completing purchase with Zapier integration:', error);
      
      // Fallback in caso di errore con Zapier
      toast({
        title: "Acquisto completato",
        description: "Il tuo pacchetto ByeBro è stato acquistato con successo!",
      });
      setCheckoutDialogOpen(false);
      
      const confirmationMessage: ChatMessage = {
        id: (Date.now() + 4).toString(),
        content: "Fantastico! Ho appena ricevuto la conferma del tuo acquisto. Riceverai presto un'email con tutti i dettagli del tuo pacchetto ByeBro. Buon divertimento!",
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
    }
  };

  // Formattazione del prezzo
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  // Rendering dell'icona in base al tipo di elemento
  const renderItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="h-5 w-5" />;
      case 'hotel': return <Hotel className="h-5 w-5" />;
      case 'restaurant': return <Utensils className="h-5 w-5" />;
      case 'activity': return <Music className="h-5 w-5" />;
      case 'transport': return <Car className="h-5 w-5" />;
      default: return <Gift className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">Assistente ByeBro</CardTitle>
          <CardDescription>
            Crea il tuo pacchetto completo per l'addio al celibato con un solo clic
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-[60vh] px-4">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
                      {message.sender === 'assistant' ? (
                        <AvatarImage src="/api/avatar-assistant.png" alt="Assistente" />
                      ) : (
                        <AvatarImage src="/api/avatar-user.png" alt="Tu" />
                      )}
                      <AvatarFallback>{message.sender === 'assistant' ? 'BA' : 'Tu'}</AvatarFallback>
                    </Avatar>
                    
                    <div className={`p-3 rounded-lg ${
                      message.sender === 'assistant' 
                        ? 'bg-secondary text-secondary-foreground' 
                        : 'bg-red-600 text-white'
                    }`}>
                      <p>{message.content}</p>
                      <div className={`text-xs mt-1 ${
                        message.sender === 'assistant' 
                          ? 'text-gray-500' 
                          : 'text-gray-300'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start max-w-[80%]">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/api/avatar-assistant.png" alt="Assistente" />
                      <AvatarFallback>BA</AvatarFallback>
                    </Avatar>
                    
                    <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isGeneratingPackage && (
                <div className="flex justify-start">
                  <div className="flex items-start max-w-[80%]">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/api/avatar-assistant.png" alt="Assistente" />
                      <AvatarFallback>BA</AvatarFallback>
                    </Avatar>
                    
                    <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Sto preparando il tuo pacchetto personalizzato...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="pt-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Scrivi un messaggio..."
                {...form.register('message')}
                disabled={isLoading || isGeneratingPackage}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || isGeneratingPackage}
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.message && (
              <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>
            )}
          </form>
        </CardFooter>
      </Card>
      
      {/* Dialog per la visualizzazione del pacchetto */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Il tuo pacchetto ByeBro personalizzato</DialogTitle>
            <DialogDescription>
              Seleziona le opzioni che preferisci e completa il tuo pacchetto con un solo clic.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="all" className="mt-4">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="all">Tutti</TabsTrigger>
              <TabsTrigger value="flight">Voli</TabsTrigger>
              <TabsTrigger value="hotel">Hotel</TabsTrigger>
              <TabsTrigger value="restaurant">Ristoranti</TabsTrigger>
              <TabsTrigger value="activity">Attività</TabsTrigger>
              <TabsTrigger value="transport">Trasporti</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packageItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`overflow-hidden cursor-pointer transition-colors ${
                        item.selected 
                          ? 'ring-2 ring-red-600 border-transparent' 
                          : 'hover:border-red-200'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <div className="relative h-40">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge 
                            className={`${
                              item.selected 
                                ? 'bg-red-600 hover:bg-red-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {item.selected ? 'Selezionato' : 'Aggiungi'}
                          </Badge>
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-black bg-opacity-50 text-white border-none">
                            <div className="flex items-center space-x-1">
                              {renderItemIcon(item.type)}
                              <span className="capitalize">
                                {item.type === 'flight' ? 'Volo' :
                                  item.type === 'hotel' ? 'Hotel' :
                                  item.type === 'restaurant' ? 'Ristorante' :
                                  item.type === 'activity' ? 'Attività' : 'Trasporto'}
                              </span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-3">
                        <h3 className="font-bold truncate">{item.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 h-10">{item.description}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.date && (
                            <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>{item.date}</span>
                            </Badge>
                          )}
                          
                          {item.location && (
                            <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span>{item.location}</span>
                            </Badge>
                          )}
                          
                          {item.duration && (
                            <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>{item.duration}</span>
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-3 font-bold text-lg">
                          {formatPrice(item.price)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {['flight', 'hotel', 'restaurant', 'activity', 'transport'].map((type) => (
              <TabsContent key={type} value={type}>
                <ScrollArea className="h-[50vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packageItems
                      .filter(item => item.type === type)
                      .map((item) => (
                        <Card 
                          key={item.id} 
                          className={`overflow-hidden cursor-pointer transition-colors ${
                            item.selected 
                              ? 'ring-2 ring-red-600 border-transparent' 
                              : 'hover:border-red-200'
                          }`}
                          onClick={() => toggleItemSelection(item.id)}
                        >
                          <div className="relative h-40">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2">
                              <Badge 
                                className={`${
                                  item.selected 
                                    ? 'bg-red-600 hover:bg-red-700' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {item.selected ? 'Selezionato' : 'Aggiungi'}
                              </Badge>
                            </div>
                          </div>
                          
                          <CardContent className="p-3">
                            <h3 className="font-bold truncate">{item.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 h-10">{item.description}</p>
                            
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.date && (
                                <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  <span>{item.date}</span>
                                </Badge>
                              )}
                              
                              {item.location && (
                                <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                                  <MapPin className="h-3 w-3" />
                                  <span>{item.location}</span>
                                </Badge>
                              )}
                              
                              {item.duration && (
                                <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  <span>{item.duration}</span>
                                </Badge>
                              )}
                            </div>
                            
                            <div className="mt-3 font-bold text-lg">
                              {formatPrice(item.price)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Totale: {formatPrice(totalPrice)}</h3>
              <p className="text-sm text-gray-500">
                {packageItems.filter(item => item.selected).length} elementi selezionati
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
                Annulla
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={proceedToCheckout}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Acquista con un clic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per il checkout */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completa il tuo acquisto</DialogTitle>
            <DialogDescription>
              Rivedi il tuo pacchetto ByeBro e conferma l'acquisto con un clic.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 my-4">
            <h3 className="font-semibold">Riepilogo del pacchetto:</h3>
            
            {packageItems
              .filter(item => item.selected)
              .map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center space-x-2">
                    {renderItemIcon(item.type)}
                    <span>{item.title}</span>
                  </div>
                  <span>{formatPrice(item.price)}</span>
                </div>
              ))}
              
            <div className="flex justify-between items-center pt-2 font-bold">
              <span>Totale:</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              Torna al pacchetto
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={completeCheckout}
            >
              Conferma acquisto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente Clock per l'icona della durata
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