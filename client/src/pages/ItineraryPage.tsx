/**
 * LEGACY PAGE - NOT PART OF REAL FLOW
 * 
 * This page belongs to the old authenticated dashboard/trip management flow.
 * It is NOT used by the chatbot → Itinerary → Checkout real flow.
 * 
 * For the real flow, use:
 * - /itinerary (Itinerary.tsx) - reads from currentItinerary localStorage
 * - /checkout (Checkout.tsx) - books hotels and shows Aviasales link
 * 
 * Route: /itinerary/:id (requires authentication)
 */
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip, Itinerary } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ItineraryResults from "@/components/ItineraryResults";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Calendar, Map, Users, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch trip details
  const { 
    data: trip,
    isLoading: isTripLoading,
    error: tripError
  } = useQuery<Trip>({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId && isAuthenticated,
  });

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (isNaN(tripId)) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Header />
        <main className="flex-grow py-10">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold font-poppins mb-4">Invalid Itinerary ID</h1>
            <p className="text-gray-600 mb-6">The itinerary ID is not valid.</p>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => setLocation("/dashboard")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      
      <main className="flex-grow">
        <div className="bg-primary text-white py-12">
          <div className="container mx-auto px-4">
            <Button 
              variant="ghost" 
              className="text-white mb-4 hover:bg-white/20 p-0"
              onClick={() => setLocation("/dashboard")}
            >
              <ChevronLeft className="mr-2 h-5 w-5" /> Back to Dashboard
            </Button>
            
            {isTripLoading ? (
              <>
                <Skeleton className="h-10 w-64 bg-white/20 mb-2" />
                <Skeleton className="h-5 w-96 bg-white/20" />
              </>
            ) : tripError ? (
              <div>
                <h1 className="text-3xl font-bold font-poppins mb-2">Error Loading Trip</h1>
                <p>There was a problem loading your trip details.</p>
              </div>
            ) : trip ? (
              <>
                <h1 className="text-3xl font-bold font-poppins mb-2">{trip.name}</h1>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center text-white/90">
                    <Calendar className="mr-2 h-5 w-5" />
                    <span>{trip.startDate} to {trip.endDate}</span>
                  </div>
                  <div className="flex items-center text-white/90">
                    <Map className="mr-2 h-5 w-5" />
                    <span>{trip.destinations.join(", ")}</span>
                  </div>
                  <div className="flex items-center text-white/90">
                    <Users className="mr-2 h-5 w-5" />
                    <span>{trip.participants} participants</span>
                  </div>
                  <div className="flex items-center text-white/90">
                    <Wallet className="mr-2 h-5 w-5" />
                    <span>Budget: €{trip.budget}/person</span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h1 className="text-3xl font-bold font-poppins mb-2">Trip Not Found</h1>
                <p>This trip does not exist or you don't have access to it.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Itinerary Results Section */}
        <ItineraryResults tripId={tripId} />
        
        {/* Call to Action */}
        <div className="py-12 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold font-poppins mb-4">Ready to Book Your Bachelor Party?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Select your favorite itinerary above and our team will help you finalize all the details for your unforgettable bachelor party experience.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Button className="bg-primary hover:bg-accent">
                Contact a Party Planner
              </Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                Share Itineraries
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
