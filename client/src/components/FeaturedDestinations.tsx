import { useQuery } from "@tanstack/react-query";
import { Destination } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, StarHalf } from "lucide-react";
import { Link } from "wouter";

export default function FeaturedDestinations() {
  const { data: destinations, isLoading, error } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-48 mt-2" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden shadow-lg">
                <Skeleton className="h-64 w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Popular Destinations</h2>
            <p className="text-red-500">Error loading destinations. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-poppins">Popular Destinations</h2>
            <p className="text-gray-600 mt-2">Top picks for your unforgettable bachelor party</p>
          </div>
          <Link href="/destinations" className="text-primary hover:text-accent font-medium hidden md:block">
            View all destinations
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations?.slice(0, 3).map((destination) => (
            <div key={destination.id} className="rounded-xl overflow-hidden shadow-lg group">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={`${destination.name} - ${destination.country}`} 
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                />
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <h3 className="text-white text-xl font-bold font-poppins">{destination.name}</h3>
                  <p className="text-white text-sm">{destination.country}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center mb-2">
                  {destination.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className={`${
                        index === 0 ? 'bg-green-100 text-green-800' : 
                        index === 1 ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'
                      } text-xs px-2 py-1 rounded-full font-medium ${index > 0 ? 'ml-2' : ''}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4">{destination.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="text-yellow-400 flex">
                      {renderRatingStars(destination.rating)}
                    </div>
                    <span className="text-gray-600 ml-1 text-sm">{destination.rating} ({destination.reviewCount})</span>
                  </div>
                  <Button variant="ghost" className="text-primary hover:text-accent font-medium">
                    Explore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Link href="/destinations" className="text-primary hover:text-accent font-medium">
            View all destinations
          </Link>
        </div>
      </div>
    </section>
  );
}
