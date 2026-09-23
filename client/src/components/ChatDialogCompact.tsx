import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, Sparkles, Beer } from "lucide-react";
import byebiLogo from "@/assets/byebi-logo.png";
import {
  normalizeFutureTripDate,
  calculateTripDays,
  isValidDateRange,
  formatFlightDateTime,
} from "@shared/dateUtils";
import { getCanonicalCityName } from "@shared/cityMapping";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { consumeJsonSse } from "@/lib/sse";
import { createChatCheckoutContext } from "@/lib/chatCheckout";
import { createTripContext } from "@/lib/tripContext";
import { savePlannedTrip } from "@/lib/plannedTrip";
import { debugLog, debugWarn } from "@/lib/debug";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2_000),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
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

export default function ChatDialogCompact({
  open,
  onOpenChange,
  initialMessage,
}: ChatDialogCompactProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const flightsRef = useRef<FlightInfo[]>([]);
  const [originCity, setOriginCity] = useState<string>("");
  const originCityRef = useRef<string>("");
  const [selectedFlight, setSelectedFlight] =
    useState<SelectedFlightData | null>(null);
  const selectedFlightRef = useRef<SelectedFlightData | null>(null);
  const [pendingFlightSelection, setPendingFlightSelection] = useState<
    number | null
  >(null);
  const pendingItineraryNavigation = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const pendingFlightSearchRef = useRef<Record<string, unknown> | null>(null);
  const conversationStateRef = useRef<ConversationState>({
    selectedDestination: "",
    tripDetails: {
      people: 0,
      days: 0,
      startDate: "",
      endDate: "",
      adventureType: "",
      interests: [],
      budget: "medio",
    },
    partyType: "bachelor",
  });

  const [conversationState, setConversationState] = useState<ConversationState>(
    {
      selectedDestination: "",
      tripDetails: {
        people: 0,
        days: 0,
        startDate: "",
        endDate: "",
        adventureType: "",
        interests: [],
        budget: "medio",
      },
      partyType: "bachelor",
    },
  );

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
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
    flightsRef.current = flights;
  }, [flights]);

  useEffect(() => {
    originCityRef.current = originCity;
  }, [originCity]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  useEffect(() => {
    selectedFlightRef.current = selectedFlight;
  }, [selectedFlight]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

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
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);
    setLoadingMessage("Thinking...");
    const controller = new AbortController();
    streamAbortRef.current?.abort();
    streamAbortRef.current = controller;
    let assistantMessageId: string | null = null;

    try {
      const conversationHistory = messagesRef.current.slice(-12).map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content.slice(0, 8_000),
      }));

      const currentState = conversationStateRef.current;
      const payload = {
        message: trimmedMessage,
        selectedDestination: currentState.selectedDestination,
        tripDetails: currentState.tripDetails,
        conversationHistory,
        partyType: currentState.partyType,
        originCity: originCityRef.current,
        flights: flightsRef.current,
      };
      const response = await apiRequest(
        "POST",
        "/api/chat/openai-stream",
        payload,
        { signal: controller.signal, timeoutMs: 30_000 },
      );

      assistantMessageId = (Date.now() + 1).toString();
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        content: "",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, placeholderMessage]);

      let accumulatedContent = "";

      await consumeJsonSse(response, {
        onEvent: (jsonData: any) => {
          if (jsonData.tool_call) {
            if (jsonData.tool_call.name === "search_flights") {
              setLoadingMessage("Preparing checkout...");
            } else if (jsonData.tool_call.name === "search_hotels") {
              setLoadingMessage("Finding hotels for you...");
            } else if (jsonData.tool_call.name === "select_flight") {
              setLoadingMessage("Selecting your flight...");
            } else if (jsonData.tool_call.name === "unlock_checkout") {
              setLoadingMessage("Preparing checkout...");
            }
            handleToolCall(jsonData.tool_call);
          }

          if (jsonData.tool_result) {
            if (jsonData.tool_result.name === "search_flights") {
              const checkoutContext = createChatCheckoutContext(
                pendingFlightSearchRef.current,
                jsonData.tool_result.result,
                "bachelor",
              );
              pendingFlightSearchRef.current = null;
              if (checkoutContext) {
                localStorage.setItem(
                  "currentItinerary",
                  JSON.stringify(checkoutContext),
                );
                onOpenChange(false);
                setLocation("/checkout");
              }
            }
            if (
              jsonData.tool_result.name === "search_flights" ||
              jsonData.tool_result.name === "search_hotels"
            ) {
              setLoadingMessage("Preparing your results...");
            } else {
              setLoadingMessage(null);
            }
          }

          if (jsonData.content) {
            if (!accumulatedContent) setLoadingMessage(null);
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

      if (pendingItineraryNavigation.current) {
        pendingItineraryNavigation.current = false;
        debugLog("🛒 Auto-navigating to checkout after flight selection");
        saveCurrentItinerary();
        onOpenChange(false);
        setLocation("/checkout");
      }
    } catch (error) {
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== assistantMessageId && msg.content !== "",
        ),
      );

      if (controller.signal.aborted) {
        setIsLoading(false);
        setLoadingMessage(null);
        return;
      }
      console.error("Chat error:", error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: t('chat.genericError'),
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      setLoadingMessage(null);
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  };

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
            originCity: originCityRef.current || originCity || "",
            destinationCity: conversationState.selectedDestination,
            checkoutUrl: flight.checkoutUrl,
          };
          debugLog(
            `✈️ Processing pending flight selection ${flightNum}:`,
            flightData,
          );
          setSelectedFlight(flightData);
          selectedFlightRef.current = flightData;
          localStorage.setItem("selectedFlight", JSON.stringify(flightData));
          setShowGenerateButton(true);
          if (isLoadingRef.current) {
            pendingItineraryNavigation.current = true;
          } else {
            debugLog("🛒 Auto-navigating to checkout (deferred flight, stream already done)");
            saveCurrentItinerary();
            onOpenChange(false);
            setLocation("/checkout");
          }
        }
      }
      setPendingFlightSelection(null);
    }
  }, [
    flights,
    pendingFlightSelection,
    originCity,
    conversationState.selectedDestination,
  ]);

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
      form.setValue("message", initialMessage);
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 300);
    }
  }, [initialMessage, open]);

  useEffect(() => {
    if (
      conversationState.selectedDestination &&
      conversationState.tripDetails.people > 0 &&
      conversationState.tripDetails.startDate
    ) {
      saveCurrentItinerary();
    }
  }, [conversationState, flights, originCity, selectedFlight]);

  const saveCurrentItinerary = () => {
    const currentConversationState = conversationStateRef.current;
    const { selectedDestination, tripDetails } = currentConversationState;
    const userOriginCity = (originCityRef.current || originCity || "").trim();

    if (
      !userOriginCity ||
      !selectedDestination ||
      !tripDetails.startDate ||
      !tripDetails.endDate ||
      tripDetails.people <= 0
    ) {
      debugWarn("Trip context is incomplete; checkout state was not persisted");
      return;
    }

    const currentSelectedFlight = selectedFlightRef.current ?? selectedFlight;
    const partyType = currentConversationState.partyType === "bachelorette"
      ? "bachelorette"
      : "bachelor";
    const currentItinerary = createTripContext({
      origin: userOriginCity,
      originCity: userOriginCity,
      destination: selectedDestination,
      startDate: tripDetails.startDate,
      endDate: tripDetails.endDate,
      people: tripDetails.people,
      partyType,
      aviasalesCheckoutUrl: currentSelectedFlight?.checkoutUrl || "",
      flightLabel: currentSelectedFlight
        ? `${currentSelectedFlight.airline} - ${currentSelectedFlight.originCity} → ${currentSelectedFlight.destinationCity}`
        : `${userOriginCity} → ${selectedDestination}`,
    });

    if (!currentItinerary) {
      debugWarn("Trip context validation failed; checkout state was not persisted");
      return;
    }

    localStorage.setItem("currentItinerary", JSON.stringify(currentItinerary));
    if (currentSelectedFlight) {
      localStorage.setItem("selectedFlight", JSON.stringify(currentSelectedFlight));
    }
    debugLog("💾 Saved validated TripContext to localStorage:", currentItinerary);

    if (isAuthenticated && user?.id) {
      void savePlannedTrip({
        ...currentItinerary,
        budget: tripDetails.budget,
        activities: tripDetails.interests,
      })
        .then(async ({ created }) => {
          await queryClient.invalidateQueries({ queryKey: [`/api/trips/user/${user.id}`] });
          if (created) {
            toast({
              title: t('chat.tripSaved'),
              description: t('chat.tripSavedDesc'),
            });
          }
        })
        .catch(() => toast({
          title: t('chat.tripSaveError'),
          description: t('chat.tripSaveErrorDesc'),
          variant: "destructive",
        }));
    }
  };

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
          setConversationState((prev) => {
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
            setConversationState((prev) => {
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
          setConversationState((prev) => {
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

      case "select_flight":
        const flightNum = toolCall.arguments.flight_number;
        if (typeof flightNum === "number" && flightNum >= 1) {
          if (flights.length > 0 && flightNum <= flights.length) {
            const flight = flights[flightNum - 1];
            if (flight) {
              const flightData: SelectedFlightData = {
                flightIndex: flightNum,
                airline: flight.airline,
                departure_at: flight.departure_at,
                return_at: flight.return_at,
                flight_number: flight.flight_number,
                originCity: originCityRef.current || originCity || "",
                destinationCity: conversationState.selectedDestination,
                checkoutUrl: flight.checkoutUrl,
              };
              debugLog(`✈️ User selected flight ${flightNum}:`, flightData);
              setSelectedFlight(flightData);
              selectedFlightRef.current = flightData;
              localStorage.setItem("selectedFlight", JSON.stringify(flightData));
              pendingItineraryNavigation.current = true;
              setShowGenerateButton(true);
            }
          } else {
            debugLog(`✈️ Storing pending flight selection: ${flightNum}`);
            setPendingFlightSelection(flightNum);
          }
        }
        break;

      case "unlock_checkout":
        debugLog(
          "🔓 Checkout unlocked - saving and navigating to checkout",
        );
        saveCurrentItinerary();
        try {
          const savedData = localStorage.getItem("currentItinerary");
          if (savedData) {
            const itinerary = JSON.parse(savedData);
            itinerary.checkoutApproved = true;
            localStorage.setItem("currentItinerary", JSON.stringify(itinerary));
            debugLog("✅ checkoutApproved flag saved, navigating to /checkout");
          }
        } catch (e) {
          debugWarn("Failed to update checkoutApproved flag:", e);
        }
        onOpenChange(false);
        setLocation("/checkout");
        break;
    }
  };

  const onSubmit = async (data: MessageFormValues) => {
    if (isLoading) return;
    form.reset();
    await sendChatRequest(data.message, true);
  };

  const handleGenerateItinerary = () => {
    saveCurrentItinerary();
    onOpenChange(false);
    setLocation("/checkout");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 bg-[#000000]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-[#fa0006]">
            <Bot className="w-6 h-6 text-red-600" />
            ByeBro Chat Assistant
            {conversationState.selectedDestination && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                → {conversationState.selectedDestination}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 px-6 py-4 overflow-y-auto"
        >
          <div className="space-y-4">
            {messages
              .filter((msg) => msg.content && msg.content.trim())
              .map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    {message.sender === "user" ? (
                      <AvatarFallback className="bg-amber-500">
                        <Beer className="w-4 h-4 text-white" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={byebiLogo} alt="ByeBi" />
                        <AvatarFallback className="bg-red-500">
                          <Bot className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div
                    className="max-w-[75%] rounded-lg px-4 py-2 bg-[#f5f5f5] text-[#000000]"
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={byebiLogo} alt="ByeBi" />
                  <AvatarFallback className="bg-red-500">
                    <Bot className="w-4 h-4 text-white" />
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
          {showGenerateButton && (
            <Button
              onClick={handleGenerateItinerary}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-6 shadow-lg"
              data-testid="button-generate-itinerary"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Vai al Checkout
            </Button>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <Input
              {...form.register("message")}
              placeholder={t('chat.messagePlaceholder')}
              className="flex-1 bg-[#fafafa]"
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
