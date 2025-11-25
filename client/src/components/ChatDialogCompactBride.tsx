import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Heart, User, Sparkles } from 'lucide-react';

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

interface ChatDialogCompactBrideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}

export default function ChatDialogCompactBride({ open, onOpenChange, initialMessage }: ChatDialogCompactBrideProps) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Ciao! 💕 Dove vuoi andare per il tuo addio al nubilato? Dimmi la città e ti creo un pacchetto personalizzato perfetto per te e le tue amiche!',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    partyType: 'bachelorette'
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialMessage && open) {
      form.setValue('message', initialMessage);
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 300);
    }
  }, [initialMessage, open]);

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
          const [startDate, endDate] = value.split(',').map(d => d.trim());
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`📅 Parsed dates: ${startDate} - ${endDate} (${days} days)`);
            setConversationState(prev => ({ 
              ...prev, 
              tripDetails: { 
                ...prev.tripDetails, 
                startDate, 
                endDate, 
                days 
              } 
            }));
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
          const partyType = eventType.includes('nubilato') || eventType.includes('bachelorette') 
            ? 'bachelorette' 
            : 'bachelor';
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
      }
    }
    
    return content.replace(directiveRegex, '').trim();
  };

  const onSubmit = async (data: MessageFormValues) => {
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
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const payload = {
        message: data.message,
        selectedDestination: conversationState.selectedDestination,
        tripDetails: conversationState.tripDetails,
        conversationHistory,
        partyType: conversationState.partyType
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
      
      if (messages.length >= 3) {
        setShowGenerateButton(true);
      }

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
    onOpenChange(false);
    setLocation('/itinerary');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-600" />
            ByeBride Chat Assistant
            {conversationState.selectedDestination && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                → {conversationState.selectedDestination}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={message.sender === 'user' ? 'bg-purple-500' : 'bg-pink-500'}>
                    {message.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Heart className="w-4 h-4 text-white" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gradient-to-br from-pink-50 to-pink-100 text-gray-900 border border-pink-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-pink-500">
                    <Heart className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t space-y-3">
          {showGenerateButton && (
            <Button
              onClick={handleGenerateItinerary}
              className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-semibold py-6 shadow-lg"
              data-testid="button-generate-itinerary-bride"
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
              data-testid="input-chat-message-bride"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-pink-600 hover:bg-pink-700"
              data-testid="button-send-message-bride"
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
