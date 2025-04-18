import { useQuery } from "@tanstack/react-query";
import { Itinerary } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, StarHalf, Calendar, Check } from "lucide-react";

interface ItineraryResultsProps {
  tripId: number;
}

export default function ItineraryResults({ tripId }: ItineraryResultsProps) {
  const { data: itineraries, isLoading, error } = useQuery<Itinerary[]>({
    queryKey: [`/api/trips/${tripId}/itineraries`],
  });

  // Helper function to render rating stars
  const renderRatingStars = (rating: string) => {
    const ratingNum = parseFloat(rating);
    const fullStars = Math.floor(ratingNum);
    const hasHalfStar = ratingNum % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="fill-yellow-400 text-yellow-400" />);
    }

    return stars;
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-light">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-72 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-3" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
                <Skeleton className="h-48 w-full" />
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full my-4" />
                  <Skeleton className="h-4 w-full my-2" />
                  <Skeleton className="h-4 w-full my-2" />
                  <Skeleton className="h-4 w-full my-2" />
                  <Skeleton className="h-10 w-full mt-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !itineraries || itineraries.length === 0) {
    return (
      <section className="py-16 bg-light">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Your Custom Itineraries</h2>
            <p className="text-red-500">
              {error ? "Error loading itineraries. Please try again later." : "No itineraries found for your trip."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Your Custom Itineraries</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">Based on your preferences, we've created these perfect bachelor party experiences. Choose the one you like best!</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {itineraries.map((itinerary) => (
            <div key={itinerary.id} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `url('${itinerary.image}')` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-4">
                    <h3 className="text-white text-xl font-bold font-poppins">{itinerary.name}</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-yellow-400 flex">
                        {renderRatingStars(itinerary.rating)}
                      </div>
                      <span className="text-white ml-1 text-sm">{itinerary.rating}/5 recommended</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <Calendar className="text-primary mr-2 h-4 w-4" />
                    <span className="text-gray-700">{itinerary.duration}</span>
                  </div>
                  <div className="text-primary font-bold">€{itinerary.price} <span className="text-sm font-normal text-gray-500">/ person</span></div>
                </div>
                
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <h4 className="font-bold mb-2">Itinerary Highlights</h4>
                  <ul className="space-y-2">
                    {itinerary.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="text-green-500 mt-1 mr-2 h-4 w-4" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-bold">Included</h4>
                    <Button variant="link" className="text-primary text-sm hover:text-accent p-0">
                      See full details
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {itinerary.includes.map((item, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                
                <Button className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-accent">
                  Book This Package
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {itineraries.length > 2 && (
          <div className="text-center">
            <Button variant="outline" className="border border-primary text-primary hover:bg-primary hover:text-white font-bold py-2 px-6 rounded-lg">
              Show More Options
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
