import { useQuery } from "@tanstack/react-query";
import { Destination, Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, StarHalf, ExternalLink, Compass } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReactCountryFlag from "react-country-flag";
import { getGetYourGuideCityLink } from "@/lib/getyourguide";
import { trackEvent } from "@/lib/track";
import { useTranslation } from "@/contexts/LanguageContext";
import { localizeDestination } from "@/lib/localizeDestination";

export default function DestinationsPage() {
  const { t } = useTranslation();
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const { data: destinations, isLoading: isLoadingDestinations } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  // Helper function to convert country name to country code
  const getCountryCode = (country: string): string => {
    const countryMap: Record<string, string> = {
      "Netherlands": "NL",
      "Germany": "DE",
      "Spain": "ES",
      "Italy": "IT",
      "France": "FR",
      "United Kingdom": "GB",
      "Czech Republic": "CZ",
      "Croatia": "HR",
      "Poland": "PL",
      "Belgium": "BE",
      "Portugal": "PT",
      "Greece": "GR",
      "Sweden": "SE",
      "Denmark": "DK",
      "Austria": "AT",
      "Hungary": "HU",
      "Ireland": "IE",
      "Switzerland": "CH"
    };
    
    return countryMap[country] || "EU"; // Usa l'UE come fallback
  };

  // Helper function to render rating stars
  const renderRatingStars = (rating: string) => {
    const ratingNum = parseFloat(rating);
    const fullStars = Math.floor(ratingNum);
    const hasHalfStar = ratingNum % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="fill-yellow-400 text-yellow-400 h-4 w-4" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="fill-yellow-400 text-yellow-400 h-4 w-4" />);
    }

    return stars;
  };

  // Helper function to get best experience types for a destination
  const getDestinationExperiences = (destination: Destination) => {
    const destinationName = destination.name.toLowerCase();
    const destinationCountry = destination.country.toLowerCase();
    
    // Experience matching logic
    const experienceMatches = {
      "The Ultimate BroNight": [
        "amsterdam", "berlin", "prague", "barcelona", "budapest", "london",
        "netherlands", "germany", "czech republic", "spain", "hungary", "united kingdom"
      ],
      "My Olympic Bro": [
        "barcelona", "bilbao", "munich", "london", "milan", "rome", "paris",
        "spain", "germany", "united kingdom", "italy", "france"
      ],
      "Chill & Feel the Bro": [
        "rome", "florence", "paris", "barcelona", "lisbon", "copenhagen", "vienna",
        "italy", "france", "spain", "portugal", "denmark", "austria"
      ],
      "The Wild Broventure": [
        "interlaken", "barcelona", "split", "ibiza", "mykonos", "berlin", "prague",
        "switzerland", "spain", "croatia", "greece", "germany", "czech republic"
      ]
    };
    
    // Find matching experiences
    const matchingExperiences = [];
    for (const [expName, locations] of Object.entries(experienceMatches)) {
      if (locations.some(loc => 
        destinationName.includes(loc) || 
        destinationCountry.includes(loc)
      )) {
        matchingExperiences.push(expName);
      }
    }
    
    // Add special cases
    if (destinationName === "amsterdam") {
      // Amsterdam is the ultimate party city
      if (!matchingExperiences.includes("The Ultimate BroNight")) {
        matchingExperiences.unshift("The Ultimate BroNight");
      }
    } 
    else if (destinationName === "bilbao") {
      // Bilbao for sports
      if (!matchingExperiences.includes("My Olympic Bro")) {
        matchingExperiences.unshift("My Olympic Bro");
      }
    }
    else if (destinationName === "paris") {
      // Paris for culinary excellence
      if (!matchingExperiences.includes("Chill & Feel the Bro")) {
        matchingExperiences.unshift("Chill & Feel the Bro");
      }
    }
    
    return matchingExperiences.slice(0, 2); // Return top 2 matches
  };

  // Helper to get the experience color
  const getExperienceColor = (expName: string) => {
    const colorMap: Record<string, string> = {
      "The Ultimate BroNight": "bg-red-600",
      "My Olympic Bro": "bg-blue-600",
      "Chill & Feel the Bro": "bg-green-600",
      "The Wild Broventure": "bg-amber-600"
    };
    
    return colorMap[expName] || "bg-gray-600";
  };

  if (isLoadingDestinations) {
    return (
      <>
        <Header />
        <main>
          <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <Skeleton className="h-12 w-64 mx-auto" />
              <Skeleton className="h-5 w-full max-w-xl mx-auto mt-3" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg">
                  <Skeleton className="h-64 w-full" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={isBride ? "bg-pink-50" : "bg-gray-100"}>
        <section className={`${isBride ? "bg-gradient-to-r from-purple-950 to-pink-900" : "bg-black"} text-white py-20`}>
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {t(isBride ? "destinations.heroTitleBride" : "destinations.heroTitleBro")}
              </h1>
              <p className="text-xl max-w-3xl mx-auto">
                {t(isBride ? "destinations.heroSubtitleBride" : "destinations.heroSubtitleBro")}
              </p>
            </div>
          </div>
        </section>
        
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("destinations.allTitle")}</h2>
              <p className="text-gray-600">
                {t("destinations.allSubtitle")}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations?.map((destination) => {
                const localizedDestination = localizeDestination(destination, t);
                const recommendedExperiences = getDestinationExperiences(destination);
                const gygUrl = getGetYourGuideCityLink(destination.name);
                const handleCardClick = () => {
                  if (!gygUrl) return;
                  trackEvent("gyg_click", {
                    destinationCity: destination.name,
                    placement: "destinations",
                    url: gygUrl,
                  });
                  window.open(gygUrl, "_blank", "noopener,noreferrer");
                };
                const cardClickable = !!gygUrl;
                
                return (
                  <div
                    key={destination.id}
                    role={cardClickable ? "link" : undefined}
                    tabIndex={cardClickable ? 0 : undefined}
                    aria-label={cardClickable ? t("destinations.cardAria", { city: localizedDestination.name }) : undefined}
                    onClick={cardClickable ? handleCardClick : undefined}
                    onKeyDown={(e) => {
                      if (cardClickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleCardClick();
                      }
                    }}
                    data-testid={`card-destination-${destination.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 ${cardClickable ? "cursor-pointer hover:-translate-y-1" : ""}`}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={destination.image} 
                        alt={`${localizedDestination.name} - ${localizedDestination.country}`}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute top-4 left-4 flex items-center space-x-2">
                        <ReactCountryFlag 
                          countryCode={getCountryCode(destination.country)}
                          svg
                          style={{
                            width: '1.7em',
                            height: '1.7em',
                            border: '2px solid white',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                      {cardClickable && (
                        <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Compass className="w-3 h-3" />
                          GetYourGuide
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                        <h3 className="text-white text-xl font-bold">{localizedDestination.name}</h3>
                        <p className="text-white text-sm">{localizedDestination.country}</p>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {recommendedExperiences.map((expName, i) => (
                          <span 
                            key={i} 
                            className={`${getExperienceColor(expName)} text-white text-xs px-3 py-1 rounded-full`}
                          >
                            {expName}
                          </span>
                        ))}
                        {localizedDestination.tags?.map((tag, i) => (
                          <span 
                            key={`tag-${i}`} 
                            className="bg-gray-200 text-gray-800 text-xs px-3 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-gray-700 mb-4">{localizedDestination.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-yellow-400 flex">
                            {renderRatingStars(destination.rating)}
                          </div>
                          <span className="text-gray-600 ml-2 text-sm">{destination.rating} ({destination.reviewCount})</span>
                        </div>
                        {cardClickable && (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 group-hover:underline">
                            {t('destinations.discoverActivities')}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
