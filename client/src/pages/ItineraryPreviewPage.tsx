/**
 * LEGACY PAGE - NOT PART OF REAL FLOW
 * 
 * This page was for previewing AI-generated itineraries from the old planner flow.
 * It reads from 'lastGeneratedItinerary' localStorage, NOT 'currentItinerary'.
 * 
 * For the real flow, use:
 * - /itinerary (Itinerary.tsx) - reads from currentItinerary localStorage
 * - /checkout (Checkout.tsx) - books hotels and shows Aviasales link
 * 
 * Route: /itinerary/preview
 */
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { FaClock, FaMapMarkerAlt, FaEuroSign, FaCheckCircle, FaCocktail, FaHotel, FaGlassCheers, FaBed } from "react-icons/fa";

// Interfacce per il tipo di itinerario generato
interface ScheduleItem {
  time: string;
  activity: string;
  description: string;
  location?: string;
  cost?: string;
}

interface DayPlan {
  day: number;
  title: string;
  schedule: ScheduleItem[];
  notes?: string;
}

interface GeneratedPlan {
  title: string;
  destination: string;
  summary: string;
  days: DayPlan[];
  tips: string[];
  estimatedTotalCost: string;
}

interface StoredItinerary {
  itinerary: {
    tripId: number;
    name: string;
    description: string;
    duration: string;
    price: number;
    image: string;
    rating: string;
    highlights: string[];
    includes: string[];
    id: number;
    createdAt: string;
  };
  generatedPlan: GeneratedPlan;
}

export default function ItineraryPreviewPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [itineraryData, setItineraryData] = useState<StoredItinerary | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);

  useEffect(() => {
    // Recupera i dati dell'itinerario da localStorage
    const storedData = localStorage.getItem('lastGeneratedItinerary');
    
    if (storedData) {
      try {
        console.log("Stored itinerary data:", storedData);
        
        // Tenta di analizzare i dati dell'itinerario
        const parsedData = JSON.parse(storedData);
        
        // Verifica il formato dei dati
        if (parsedData.itinerary && parsedData.generatedPlan) {
          // Formato originale
          setItineraryData(parsedData);
          
          // Se ci sono giorni nell'itinerario, imposta il primo giorno come attivo
          if (parsedData.generatedPlan.days && parsedData.generatedPlan.days.length > 0) {
            setActiveDay(parsedData.generatedPlan.days[0].day);
          }
        } else if (parsedData.title && parsedData.destination) {
          // Formato semplificato (fallback)
          // Adatta i dati al formato previsto
          const itineraryId = Math.floor(Math.random() * 1000); // ID random per il frontend
          
          const adaptedData = {
            itinerary: {
              tripId: 0,
              name: parsedData.title,
              description: parsedData.summary || "A customized bachelor party itinerary",
              duration: parsedData.days?.length ? `${parsedData.days.length} Days` : "3 Days",
              price: 0,
              image: `https://source.unsplash.com/random/800x400/?${parsedData.destination.split(",")[0].toLowerCase()},travel`,
              rating: "5.0",
              highlights: parsedData.tips || [],
              includes: ["Accommodation", "Activities", "Custom Experience"],
              id: itineraryId,
              createdAt: new Date().toISOString()
            },
            generatedPlan: parsedData
          };
          
          // Se non ci sono giorni o sono vuoti, creiamo un giorno di esempio
          if (!adaptedData.generatedPlan.days || adaptedData.generatedPlan.days.length === 0) {
            adaptedData.generatedPlan.days = [{
              day: 1,
              title: "Free Day to Explore",
              schedule: [{
                time: "10:00",
                activity: "Morning Activity",
                description: "Start your day with a great activity in " + parsedData.destination
              }]
            }];
          }
          
          setItineraryData(adaptedData);
          setActiveDay(1);
        } else {
          // Formato non riconosciuto
          throw new Error("Formato dati non riconosciuto");
        }
      } catch (error) {
        console.error('Error parsing stored itinerary', error);
        toast({
          title: "Error",
          description: "Could not load the itinerary data. Please try generating a new one.",
          variant: "destructive",
        });
        setTimeout(() => setLocation('/'), 3000);
      }
    } else {
      // Se non ci sono dati, torna alla home
      toast({
        title: "No Itinerary Found",
        description: "Please complete the trip planning form to generate an itinerary.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/'), 3000);
    }
  }, [toast, setLocation]);

  // Se i dati non sono stati caricati, mostra un messaggio di caricamento
  if (!itineraryData) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading your itinerary...</h2>
          <p>Please wait while we prepare your amazing bachelor party plan.</p>
        </div>
      </div>
    );
  }

  const { itinerary, generatedPlan } = itineraryData;

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{generatedPlan.title}</h1>
          <p className="text-xl text-gray-600 mb-6">{generatedPlan.destination}</p>
          <p className="max-w-3xl mx-auto">{generatedPlan.summary}</p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              Back to Home
            </Button>
            <Button
              variant="default"
              onClick={() => setLocation('/auth')}
              className="bg-red-600 hover:bg-red-700"
            >
              Create Account to Save
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Day-by-Day Itinerary</CardTitle>
              <CardDescription>Your bachelor party adventure in {generatedPlan.destination}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={activeDay.toString()} onValueChange={(value) => setActiveDay(parseInt(value))}>
                <TabsList className="mb-6 flex overflow-x-auto pb-2 space-x-2">
                  {generatedPlan.days.map((day) => (
                    <TabsTrigger 
                      key={day.day} 
                      value={day.day.toString()}
                      className="min-w-[100px] data-[state=active]:bg-red-600 data-[state=active]:text-white"
                    >
                      Day {day.day}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {generatedPlan.days.map((day) => (
                  <TabsContent key={day.day} value={day.day.toString()}>
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                      <h3 className="text-2xl font-bold mb-2">{day.title}</h3>
                      {day.notes && (
                        <p className="text-gray-600 mb-4 italic">{day.notes}</p>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {day.schedule.map((item, idx) => (
                        <div key={idx} className="border-l-4 border-red-600 pl-4">
                          <div className="flex items-center mb-2">
                            <FaClock className="text-red-600 mr-2" />
                            <span className="font-semibold">{item.time}</span>
                          </div>
                          <h4 className="text-xl font-bold mb-2">{item.activity}</h4>
                          <p className="text-gray-600 mb-3">{item.description}</p>
                          
                          <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-500">
                            {item.location && (
                              <div className="flex items-center">
                                <FaMapMarkerAlt className="mr-1 text-red-600" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            {item.cost && (
                              <div className="flex items-center">
                                <FaEuroSign className="mr-1 text-red-600" />
                                <span>{item.cost}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center">
                    <FaHotel className="text-red-600 mr-3 text-xl" />
                    <div>
                      <h4 className="font-semibold">Destination</h4>
                      <p className="text-gray-600">{generatedPlan.destination}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaClock className="text-red-600 mr-3 text-xl" />
                    <div>
                      <h4 className="font-semibold">Duration</h4>
                      <p className="text-gray-600">{generatedPlan.days.length} Days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaGlassCheers className="text-red-600 mr-3 text-xl" />
                    <div>
                      <h4 className="font-semibold">Activities</h4>
                      <p className="text-gray-600">
                        {generatedPlan.days.reduce((total, day) => total + day.schedule.length, 0)} planned experiences
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Barcelona Bachelor Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {generatedPlan.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start">
                      <FaCheckCircle className="text-red-600 mr-2 mt-1 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Cost Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estimated total cost per person</p>
                  <p className="text-3xl font-bold text-red-600">{generatedPlan.estimatedTotalCost}</p>
                </div>
                
                <Separator className="my-6" />
                
                <div className="grid gap-4">
                  <div className="text-center p-3 bg-slate-100 rounded-lg">
                    <p className="font-semibold mb-1">What's included:</p>
                    <ul className="text-sm text-gray-600 text-left pl-6 space-y-1">
                      <li>• All activities and experiences</li>
                      <li>• Club entrance fees</li>
                      <li>• Restaurant reservations</li>
                      <li>• Local transportation estimates</li>
                    </ul>
                  </div>
                  
                  <div className="text-center p-3 bg-slate-100 rounded-lg">
                    <p className="font-semibold mb-1">Not included:</p>
                    <ul className="text-sm text-gray-600 text-left pl-6 space-y-1">
                      <li>• Flights to Barcelona</li>
                      <li>• Accommodation</li>
                      <li>• Travel insurance</li>
                      <li>• Personal expenses</li>
                    </ul>
                  </div>
                  
                  <div className="text-center mt-2">
                    <p className="mb-4 text-sm text-gray-600">Want to save this itinerary?</p>
                    <Button
                      onClick={() => setLocation('/auth')}
                      className="bg-red-600 hover:bg-red-700 w-full"
                    >
                      Create Free Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}