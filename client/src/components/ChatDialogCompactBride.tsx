import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Heart, User } from 'lucide-react';
import { normalizeFutureTripDate, calculateTripDays, isValidDateRange } from '@shared/dateUtils';
import { getCanonicalCityName } from '@shared/cityMapping';
import { useTranslation } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { consumeJsonSse } from '@/lib/sse';
import { createChatCheckoutContext } from '@/lib/chatCheckout';
import { debugLog } from '@/lib/debug';

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2_000),
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
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: '1',
      content: t('chat.brideWelcome'),
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [originCity, setOriginCity] = useState<string>('');
  const originCityRef = useRef<string>('');
  const streamAbortRef = useRef<AbortController | null>(null);
  const pendingFlightSearchRef = useRef<Record<string, unknown> | null>(null);
  const conversationStateRef = useRef<ConversationState>({
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
    messagesRef.current = messages;
  }, [messages]);


  useEffect(() => {
    originCityRef.current = originCity;
  }, [originCity]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  useEffect(() => {
    if (!open) {
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      pendingFlightSearchRef.current = null;
      setIsLoading(false);
      setLoadingMessage(null);
    }

    return () => streamAbortRef.current?.abort();
  }, [open]);

  const sendChatRequest = async (message: string, addUserMessage: boolean) => {
    if (isLoading) return;
    const trimmedMessage = message.trim();
    if (addUserMessage && !trimmedMessage) return;

    if (addUserMessage) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: trimmedMessage,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);
    const controller = new AbortController();
    streamAbortRef.current?.abort();
    streamAbortRef.current = controller;
    let assistantMessageId: string | null = null;

    try {
      const conversationHistory = messagesRef.current.slice(-12).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content.slice(0, 8_000)
      }));

      const currentState = conversationStateRef.current;
      const payload = {
        message: trimmedMessage,
        selectedDestination: currentState.selectedDestination,
        tripDetails: currentState.tripDetails,
        conversationHistory,
        partyType: currentState.partyType,
        originCity: originCityRef.current
      };
      const response = await apiRequest(
        'POST',
        '/api/chat/openai-stream',
        payload,
        { signal: controller.signal, timeoutMs: 30_000 },
      );

      assistantMessageId = (Date.now() + 1).toString();
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, placeholderMessage]);

      let accumulatedContent = '';

      await consumeJsonSse(response, {
        onEvent: (jsonData: any) => {
          if (jsonData.tool_call) {
            if (jsonData.tool_call.name === 'search_flights') {
              setLoadingMessage('Preparing checkout...');
            } else if (jsonData.tool_call.name === 'search_hotels') {
              setLoadingMessage('Searching for hotels...');
            }
            handleToolCall(jsonData.tool_call);
          }

          if (jsonData.tool_result) {
            if (jsonData.tool_result.name === 'search_flights') {
              const checkoutContext = createChatCheckoutContext(
                pendingFlightSearchRef.current,
                jsonData.tool_result.result,
                "bachelorette",
              );
              pendingFlightSearchRef.current = null;
              if (checkoutContext) {
                localStorage.setItem('currentItinerary', JSON.stringify(checkoutContext));
                localStorage.removeItem('selectedFlight');

                onOpenChange(false);
                setLocation('/checkout');
              }
            }
            setLoadingMessage(null);
          }

          if (jsonData.content) {
            accumulatedContent += jsonData.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg,
              ),
            );
          }
        },
      });

      setIsLoading(false);
      setLoadingMessage(null);
    } catch (error) {
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== assistantMessageId && msg.content !== '',
        ),
      );

      if (controller.signal.aborted) {
        setIsLoading(false);
        setLoadingMessage(null);
        return;
      }
      console.error('Chat error:', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: t('chat.genericError'),
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, errorMessage]);
      setLoadingMessage(null);
      setIsLoading(false);
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  };


  useEffect(() => {
    if (initialMessage && open) {
      const initialDestination = getCanonicalCityName(initialMessage);
      if (initialDestination) {
        setConversationState((prev) => {
          const next = { ...prev, selectedDestination: initialDestination };
          conversationStateRef.current = next;
          return next;
        });
      }
      form.setValue('message', initialMessage);
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 300);
    }
  }, [initialMessage, open]);


  interface ToolCallData {
    name: string;
    arguments: Record<string, any>;
  }

  const handleToolCall = (toolCall: ToolCallData) => {
    debugLog(`🔧 Tool call received: ${toolCall.name}`, toolCall.arguments);

    switch (toolCall.name) {
      case "search_flights": {
        const {
          origin,
          destination,
          departure_date,
          return_date,
          passengers,
        } = toolCall.arguments;
        // Extract structured state from search_flights arguments
        if (destination) {
          setConversationState(prev => {
            const next = { ...prev, selectedDestination: destination };
            conversationStateRef.current = next;
            return next;
          });
        }
        if (origin) {
          setOriginCity(origin);
          originCityRef.current = origin;
        }
        if (departure_date && return_date) {
          const normalizedStart = normalizeFutureTripDate(departure_date);
          const normalizedEnd = normalizeFutureTripDate(return_date);
          if (normalizedStart && normalizedEnd && isValidDateRange(normalizedStart, normalizedEnd)) {
            const days = calculateTripDays(normalizedStart, normalizedEnd);
            setConversationState(prev => {
              const next = {
                ...prev,
                tripDetails: {
                  ...prev.tripDetails,
                  startDate: normalizedStart,
                  endDate: normalizedEnd,
                  days,
                },
              };
              conversationStateRef.current = next;
              return next;
            });
          }
        }
        if (typeof passengers === "number" && passengers > 0) {
          setConversationState(prev => {
            const next = {
              ...prev,
              tripDetails: {
                ...prev.tripDetails,
                people: passengers,
              },
            };
            conversationStateRef.current = next;
            return next;
          });
        }
        pendingFlightSearchRef.current = toolCall.arguments;
        break;
      }

    }
  };

  const onSubmit = async (data: MessageFormValues) => {
    if (isLoading) return;
    form.reset();
    await sendChatRequest(data.message, true);
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
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  {loadingMessage && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {loadingMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="px-6 py-4 border-t space-y-3">
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <Input
              {...form.register('message')}
              placeholder={t('chat.messagePlaceholder')}
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
