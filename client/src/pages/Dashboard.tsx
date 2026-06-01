import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trip } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Map, GlassWater, ListChecks, Shirt, User } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch user trips
  const { data: trips, isLoading, error } = useQuery<Trip[]>({
    queryKey: [`/api/trips/user/${user?.id}`],
    enabled: !!user?.id,
  });

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      
      <main className="flex-grow py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-poppins mb-2">
              {t('dashboard.welcome', { name: user?.firstName || user?.username || '' })}
            </h1>
            <p className="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          
          <div className="flex items-center mb-8">
            <div className="bg-primary text-white p-2 rounded-full mr-4">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('dashboard.account')}</h2>
              <p className="text-sm text-gray-600">{t('dashboard.accountDesc')}</p>
            </div>
          </div>
          
          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="trips"><ListChecks className="mr-2 h-4 w-4" /> {t('dashboard.myTrips')}</TabsTrigger>
              <TabsTrigger value="merchandise"><Shirt className="mr-2 h-4 w-4" /> {t('dashboard.myMerchandise')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trips">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <Card key={i} className="shadow-md">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-10 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center p-10">
                  <p className="text-red-500">{t('dashboard.errorTrips')}</p>
                </div>
              ) : trips && trips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trips.map((trip) => (
                    <Card key={trip.id} className="shadow-md">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle>{trip.name}</CardTitle>
                          <div className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {trip.experienceType}
                          </div>
                        </div>
                        <CardDescription>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="mr-1 h-3 w-3" /> 
                            {trip.startDate} - {trip.endDate}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Map className="mr-2 h-4 w-4 text-primary" />
                            <span>{t('dashboard.destinations')}: {trip.destinations.join(", ")}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <GlassWater className="mr-2 h-4 w-4 text-primary" />
                            <span>{t('dashboard.activities')}: {trip.activities.slice(0, 2).join(", ")}
                              {trip.activities.length > 2 ? ` and ${trip.activities.length - 2} more` : ""}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">{t('dashboard.budget')}:</span> €{trip.budget} {t('dashboard.perPerson')}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full bg-primary hover:bg-accent"
                          onClick={() => {
                            const destination = trip.destinations?.[0] || "";
                            localStorage.setItem("currentItinerary", JSON.stringify({
                              destination,
                              origin: "Italia",
                              startDate: trip.startDate,
                              endDate: trip.endDate,
                              people: trip.participants,
                              aviasalesCheckoutUrl: "",
                              flightLabel: `Italia → ${destination}`,
                            }));
                            setLocation("/checkout");
                          }}
                        >
                          {t('dashboard.openCheckout')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-xl">
                  <h3 className="text-xl font-bold mb-2">{t('dashboard.noTrips')}</h3>
                  <p className="text-gray-600 mb-4">{t('dashboard.noTripsDesc')}</p>
                  <Button 
                    className="bg-primary hover:bg-accent"
                    onClick={() => setLocation("/#trip-planning")}
                  >
                    Plan Your First Trip
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="merchandise">
              <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-xl">
                <h3 className="text-xl font-bold mb-2">{t('dashboard.noMerch')}</h3>
                <p className="text-gray-600 mb-4">{t('dashboard.noMerchDesc')}</p>
                <Button 
                  className="bg-primary hover:bg-accent"
                  onClick={() => setLocation("/merchandise")}
                >
                  Shop Merchandise
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
