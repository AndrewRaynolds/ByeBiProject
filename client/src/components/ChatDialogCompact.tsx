import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react';
import { normalizeFutureTripDate, calculateTripDays, isValidDateRange, formatFlightDateTime, formatDateRangeIT } from '@shared/dateUtils';

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface TripDetails {
  people: number;
  days: number;
  startDate: string;
  endDate: string;
  adventureType: string;
  interests: string[];
  budget: string;
}

interface ConversationState {
  selectedDestination: string;
  tripDetails: TripDetails;
  partyType: string;
}

interface FlightInfo {
  id?: number;
  airline: string;
  departure_at: string;
  return_at: string;
  flight_number: number;
  origin?: string;
  destination?: string;
  checkoutUrl?: string;
}

interface SelectedFlightData {
  flightIndex: number;
  airline: string;
  departure_at: string;
  return_at: string;
  flight_number: number;
  originCity: string;
  destinationCity: string;
  checkoutUrl?: string;
}

interface ChatDialogCompactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}

export default function ChatDialogCompact({ open, onOpenChange, initialMessage }: ChatDialogCompactProps) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Ciao! 👋 Dove vuoi andare per il tuo addio al celibato? Dimmi la città e ti creo un pacchetto personalizzato!',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [originCity, setOriginCity] = useState<string>('');
  const [selectedFlight, setSelectedFlight] = useState<SelectedFlightData | null>(null);
  const [pendingFlightSelection, setPendingFlightSelection] = useState<number | null>(null);
  
  const [conversationState, setConversationState] = useState<ConversationState>({
    selectedDestination: '',
    tripDetails: {
      people: 0,
      days: 0,
      startDate: '',
      endDate: '',
      adventureType: '',
      interests: [],
      budget: 'medio'
    },
    partyType: 'bachelor'
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pendingFlightSelection !== null && flights.length > 0) {
      const flightNum = pendingFlightSelection;
      if (flightNum >= 1 && flightNum <= flights.length) {
        const flight = flights[flightNum - 1];
        if (flight) {
          const flightData: SelectedFlightData = {
            flightIndex: flightNum,
            airline: flight.airline,
            departure_at: flight.departure_at,
            return_at: flight.return_at,
            flight_number: flight.flight_number,
            originCity: originCity || 'Roma',
            destinationCity: conversationState.selectedDestination,
            checkoutUrl: flight.checkoutUrl
          };
          console.log(`✈️ Processing pending flight selection ${flightNum}:`, flightData);
          setSelectedFlight(flightData);
          localStorage.setItem('selectedFlight', JSON.stringify(flightData));
          setShowGenerateButton(true);
        }
      }
      setPendingFlightSelection(null);
    }
  }, [flights, pendingFlightSelection, originCity, conversationState.selectedDestination]);

  useEffect(() => {
    if (initialMessage && open) {
      form.setValue('message', initialMessage);
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 300);
    }
  }, [initialMessage, open]);

  useEffect(() => {
    if (conversationState.selectedDestination && 
        conversationState.tripDetails.people > 0 && 
        conversationState.tripDetails.startDate) {
      saveCurrentItinerary();
    }
  }, [conversationState, flights, originCity, selectedFlight]);

  const formatDateRange = (startDate: string, endDate: string): string => {
    return formatDateRangeIT(startDate, endDate) || `${startDate} - ${endDate}`;
  };

  const saveCurrentItinerary = () => {
    const { selectedDestination, tripDetails } = conversationState;
    
    if (!selectedDestination || tripDetails.people <= 0) {
      return;
    }

    const dateStr = tripDetails.startDate && tripDetails.endDate 
      ? formatDateRange(tripDetails.startDate, tripDetails.endDate)
      : 'Date da definire';

    // Use user-selected origin city, fallback to stored origin or default
    const userOriginCity = originCity || 'Roma';
    
    console.log("✈️ FLIGHT DATA:", { 
      selectedFlight, 
      originCity: userOriginCity, 
      flightsAvailable: flights.length 
    });

    // Use selected flight if available, otherwise first flight, otherwise fallback
    let flightItem;
    if (selectedFlight) {
      flightItem = {
        id: 'flight-selected',
        type: 'flight' as const,
        name: `${selectedFlight.airline} - ${selectedFlight.originCity} → ${selectedFlight.destinationCity}`,
        description: `Volo da ${selectedFlight.originCity}`,
        details: [
          `Volo: ${selectedFlight.flight_number}`,
          'Bagaglio a mano incluso'
        ]
      };
    } else if (flights.length > 0) {
      const firstFlight = flights[0];
      flightItem = {
        id: 'flight-dynamic-1',
        type: 'flight' as const,
        name: `${firstFlight.airline} - ${userOriginCity} → ${selectedDestination}`,
        description: `Volo da ${userOriginCity}`,
        details: [
          `Volo: ${firstFlight.flight_number}`,
          'Bagaglio a mano incluso'
        ]
      };
    } else {
      flightItem = {
        id: 'flight-fallback',
        type: 'flight' as const,
        name: `Volo ${userOriginCity} → ${selectedDestination}`,
        description: `Volo diretto da ${userOriginCity}`,
        details: [
          'Bagaglio a mano incluso'
        ]
      };
    }

    const carItems = [
      {
        id: 'car-dynamic-1',
        type: 'car' as const,
        name: 'Fiat 500 o simile',
        description: 'Auto compatta 4 posti',
        price: 45,
        details: [
          `${tripDetails.days || 3} giorni`,
          'Assicurazione base inclusa',
          'Chilometraggio illimitato',
          'Ritiro aeroporto'
        ]
      }
    ];

    const activityItems = tripDetails.interests.length > 0 
      ? tripDetails.interests.slice(0, 4).map((interest, idx) => ({
          id: `activity-dynamic-${idx + 1}`,
          type: 'activity' as const,
          name: interest,
          description: `Esperienza a ${selectedDestination}`,
          price: 45 + (idx * 10),
          details: [
            'Durata: 3-4 ore',
            'Guida inclusa',
            'Prenotazione garantita'
          ]
        }))
      : [
          {
            id: 'activity-dynamic-1',
            type: 'activity' as const,
            name: 'Boat Party con DJ',
            description: 'Festa in barca con open bar',
            price: 65,
            details: ['5 ore di party', 'Open bar premium', 'DJ internazionale']
          },
          {
            id: 'activity-dynamic-2',
            type: 'activity' as const,
            name: 'Tour Serale',
            description: 'Pub crawl guidato',
            price: 35,
            details: ['4 locali inclusi', '1 drink per locale', 'Guida locale']
          }
        ];

    const currentItinerary = {
      destination: selectedDestination,
      origin: userOriginCity,
      dates: dateStr,
      people: tripDetails.people,
      startDate: tripDetails.startDate,
      endDate: tripDetails.endDate,
      days: tripDetails.days,
      partyType: conversationState.partyType,
      originCity: userOriginCity,
      selectedFlight: selectedFlight,
      aviasalesCheckoutUrl: selectedFlight?.checkoutUrl || '',
      flightLabel: selectedFlight ? `${selectedFlight.airline} - ${selectedFlight.originCity} → ${selectedFlight.destinationCity}` : '',
      flights: [flightItem],
      cars: carItems,
      activities: activityItems
    };

    localStorage.setItem('currentItinerary', JSON.stringify(currentItinerary));
    if (selectedFlight) {
      localStorage.setItem('selectedFlight', JSON.stringify(selectedFlight));
    }
    console.log('💾 Saved currentItinerary to localStorage:', currentItinerary);
  };

  const parseDirectives = (content: string): string => {
    const directiveRegex = /\[([A-Z_]+):([^\]]+)\]/g;
    let match;
    
    while ((match = directiveRegex.exec(content)) !== null) {
      const [, command, value] = match;
      
      switch (command) {
        case 'SET_DESTINATION':
          const destination = value.trim();
          console.log(`📍 Parsed destination: ${destination}`);
          setConversationState(prev => ({ 
            ...prev, 
            selectedDestination: destination 
          }));
          break;
          
        case 'SET_DATES':
          const [rawStart, rawEnd] = value.split(',').map(d => d.trim());
          const normalizedStart = normalizeFutureTripDate(rawStart);
          const normalizedEnd = normalizeFutureTripDate(rawEnd);
          
          if (normalizedStart && normalizedEnd && isValidDateRange(normalizedStart, normalizedEnd)) {
            const days = calculateTripDays(normalizedStart, normalizedEnd);
            console.log(`📅 Parsed dates: ${rawStart} -> ${normalizedStart}, ${rawEnd} -> ${normalizedEnd} (${days} days)`);
            setConversationState(prev => ({ 
              ...prev, 
              tripDetails: { 
                ...prev.tripDetails, 
                startDate: normalizedStart, 
                endDate: normalizedEnd, 
                days 
              } 
            }));
          } else {
            console.warn(`⚠️ Invalid dates: ${rawStart}, ${rawEnd}`);
          }
          break;
          
        case 'SET_PARTICIPANTS':
          const participants = parseInt(value);
          if (!isNaN(participants)) {
            console.log(`👥 Parsed participants: ${participants}`);
            setConversationState(prev => ({ 
              ...prev, 
              tripDetails: { 
                ...prev.tripDetails, 
                people: participants 
              } 
            }));
          }
          break;
          
        case 'SET_EVENT_TYPE':
          const eventType = value.trim().toLowerCase();
          const partyType = eventType.includes('celibato') || eventType.includes('bachelor') 
            ? 'bachelor' 
            : 'bachelorette';
          console.log(`🎉 Parsed event type: ${eventType} → partyType: ${partyType}`);
          setConversationState(prev => ({ 
            ...prev, 
            partyType,
            tripDetails: {
              ...prev.tripDetails,
              adventureType: eventType
            }
          }));
          break;
          
        case 'SHOW_EXPERIENCES':
          const experiences = value.split('|').map(exp => exp.trim());
          console.log(`🎯 Parsed experiences: ${experiences.join(', ')}`);
          setConversationState(prev => ({ 
            ...prev, 
            tripDetails: { 
              ...prev.tripDetails, 
              interests: experiences 
            } 
          }));
          break;
          
        case 'UNLOCK_ITINERARY_BUTTON':
          console.log('🔓 Itinerary button unlocked');
          setShowGenerateButton(true);
          break;
          
        case 'SET_ORIGIN':
          const origin = value.trim();
          console.log(`🛫 Parsed origin city: ${origin}`);
          setOriginCity(origin);
          break;
          
        case 'SELECT_FLIGHT':
          const flightNum = parseInt(value.trim());
          if (!isNaN(flightNum) && flightNum >= 1) {
            if (flights.length > 0 && flightNum <= flights.length) {
              const flight = flights[flightNum - 1];
              if (flight) {
                const flightData: SelectedFlightData = {
                  flightIndex: flightNum,
                  airline: flight.airline,
                  departure_at: flight.departure_at,
                  return_at: flight.return_at,
                  flight_number: flight.flight_number,
                  originCity: originCity || 'Roma',
                  destinationCity: conversationState.selectedDestination,
                  checkoutUrl: flight.checkoutUrl
                };
                console.log(`✈️ User selected flight ${flightNum}:`, flightData);
                setSelectedFlight(flightData);
                localStorage.setItem('selectedFlight', JSON.stringify(flightData));
                setShowGenerateButton(true);
              }
            } else {
              console.log(`✈️ Storing pending flight selection: ${flightNum}`);
              setPendingFlightSelection(flightNum);
            }
          }
          break;
      }
    }
    
    return content.replace(directiveRegex, '').trim();
  };

  const onSubmit = async (data: MessageFormValues) => {
    if (isLoading) return;
    
    const trimmedMessage = data.message.trim();
    if (!trimmedMessage) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: trimmedMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    form.reset();
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const payload = {
        message: data.message,
        selectedDestination: conversationState.selectedDestination,
        tripDetails: conversationState.tripDetails,
        conversationHistory,
        partyType: conversationState.partyType,
        originCity: originCity
      };
      console.log("🔍 GROQ STREAM PAYLOAD:", payload);
      
      const response = await fetch('/api/chat/groq-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessageId = (Date.now() + 1).toString();
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, placeholderMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
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
                
                if (jsonData.flights && Array.isArray(jsonData.flights)) {
                  console.log('✈️ Received flights from backend:', jsonData.flights);
                  setFlights(jsonData.flights);
                }
                
                if (jsonData.done) {
                  break;
                }
                
                if (jsonData.content) {
                  accumulatedContent += jsonData.content;
                  
                  const cleanedContent = parseDirectives(accumulatedContent);
                  
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: cleanedContent }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Chat error:', error);
      
      setMessages(prev => prev.filter(msg => msg.content !== ''));
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Mi dispiace, c\'è stato un problema. Riprova!',
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleGenerateItinerary = () => {
    saveCurrentItinerary();
    onOpenChange(false);
    setLocation('/itinerary');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-red-600" />
            ByeBro Chat Assistant
            {conversationState.selectedDestination && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                → {conversationState.selectedDestination}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollContainerRef} className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.filter(msg => msg.content && msg.content.trim()).map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={message.sender === 'user' ? 'bg-blue-500' : 'bg-red-500'}>
                    {message.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gradient-to-br from-red-50 to-red-100 text-gray-900 border border-red-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-red-500">
                    <Bot className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="px-6 py-4 border-t space-y-3">
          {showGenerateButton && (
            <Button
              onClick={handleGenerateItinerary}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-6 shadow-lg"
              data-testid="button-generate-itinerary"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Genera Itinerario Completo
            </Button>
          )}
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <Input
              {...form.register('message')}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-send-message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
