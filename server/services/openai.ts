import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ItineraryRequest {
  destination: string;
  country: string;
  days: number;
  groupSize: number;
  budget: "budget" | "standard" | "luxury";
  interests: string[];
  theme: string;
}

interface DailyPlan {
  day: number;
  title: string;
  schedule: {
    time: string;
    activity: string;
    description: string;
    location?: string;
    cost?: string;
  }[];
  notes?: string;
}

interface GeneratedItinerary {
  title: string;
  destination: string;
  summary: string;
  days: DailyPlan[];
  tips: string[];
  estimatedTotalCost: string;
}

// Funzione per generare itinerari di esempio in caso di fallback
function generateFallbackItinerary(request: ItineraryRequest): GeneratedItinerary {
  const budgetMultiplier = request.budget === "budget" ? 1 : request.budget === "standard" ? 1.5 : 2.5;
  const baseCost = 80 * budgetMultiplier;
  const dailyCost = baseCost * request.days;
  const totalCost = (dailyCost * request.days).toFixed(2);
  
  // Attività basate sugli interessi selezionati
  const activities: Record<string, { name: string, description: string, time: string }> = {
    nightclubs: { name: "Clubbing Experience", description: "Entrance to the hottest local club with VIP table service", time: "22:00" },
    barCrawl: { name: "Bar Hopping Tour", description: "Guided tour of the best bars in the city", time: "19:30" },
    waterSports: { name: "Water Activities", description: "Jet skiing and other water fun", time: "14:00" },
    breweryTours: { name: "Local Brewery Visit", description: "Tour of popular local craft breweries with tastings", time: "16:00" },
    sightseeing: { name: "City Landmarks Tour", description: "Quick tour of the most famous spots", time: "10:00" },
    foodTours: { name: "Gourmet Food Experience", description: "Sampling the best local cuisine", time: "13:00" },
    sportsEvents: { name: "Sports Game", description: "Tickets to a local sports match", time: "15:00" },
    boatParties: { name: "Party Boat Cruise", description: "Private boat tour with music and drinks", time: "16:00" },
    casinoNight: { name: "Casino Adventure", description: "Night at the local casino", time: "21:00" }
  };
  
  // Crea un piano giornaliero
  const createDayPlan = (dayNum: number): DailyPlan => {
    const dayActivities = [];
    
    // Attività mattutina
    dayActivities.push({
      time: "10:00",
      activity: "Brunch Recovery",
      description: "Late breakfast at a popular local spot to recover from the night before",
      location: "Local Bistro",
      cost: `€${(30 * budgetMultiplier).toFixed(0)} per person`
    });
    
    // Aggiungi una o due attività basate sugli interessi
    const selectedInterests = request.interests.slice(0, Math.min(3, request.interests.length));
    selectedInterests.forEach((interest) => {
      if (activities[interest]) {
        const activityInfo = activities[interest];
        dayActivities.push({
          time: activityInfo.time,
          activity: activityInfo.name,
          description: activityInfo.description,
          location: `${request.destination} ${activityInfo.name}`,
          cost: `€${(50 * budgetMultiplier).toFixed(0)} per person`
        });
      }
    });
    
    // Attività serale
    dayActivities.push({
      time: "20:00",
      activity: "Group Dinner",
      description: "Dinner at a lively restaurant with great atmosphere",
      location: "Popular local restaurant",
      cost: `€${(60 * budgetMultiplier).toFixed(0)} per person`
    });
    
    // Attività notturna
    dayActivities.push({
      time: "23:00",
      activity: "Nightlife Experience",
      description: "Party at a top-rated nightclub with reserved section",
      location: `Best club in ${request.destination}`,
      cost: `€${(100 * budgetMultiplier).toFixed(0)} per person`
    });
    
    return {
      day: dayNum,
      title: dayNum === 1 ? "Welcome Party" : dayNum === request.days ? "Final Blowout" : `Day ${dayNum} Adventures`,
      schedule: dayActivities,
      notes: `Make sure to plan for transport between venues in ${request.destination}`
    };
  };
  
  // Crea un giorno per ciascun giorno richiesto
  const days = [];
  for (let i = 1; i <= request.days; i++) {
    days.push(createDayPlan(i));
  }
  
  return {
    title: `${request.theme} in ${request.destination}`,
    destination: `${request.destination}, ${request.country}`,
    summary: `An unforgettable ${request.days}-day bachelor party in ${request.destination}, featuring the best nightlife, activities, and experiences tailored for a group of ${request.groupSize}.`,
    days: days,
    tips: [
      `Book accommodation close to the city center of ${request.destination} for easy access to activities`,
      "Always have a backup plan for each activity in case of unexpected issues",
      "Consider designating a different person responsible for each day's plans",
      "Keep digital copies of all reservations and bookings",
      "Have a shared expense tracking app for the group"
    ],
    estimatedTotalCost: `€${totalCost} per person`
  };
}

export async function generateItinerary(request: ItineraryRequest): Promise<GeneratedItinerary> {
  try {
    // Controlla che ci sia una chiave API di OpenAI
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
      console.log("No OpenAI API key found, using fallback itinerary");
      return generateFallbackItinerary(request);
    }
    
    const prompt = `Generate a detailed bachelor party itinerary for ${request.destination}, ${request.country}. 
    The itinerary should be for ${request.days} days with a group of ${request.groupSize} people.
    The budget level is "${request.budget}" and they are interested in: ${request.interests.join(", ")}.
    The bachelor party theme is: ${request.theme}.
    
    The itinerary should be wild, playful, and fun, in the style of the movie "The Hangover" but realistic and actually doable. 
    Include real venues, local nightclubs, restaurants, and activities that exist in ${request.destination}.
    
    Structure the response as a JSON object with the following format:
    {
      "title": "Catchy title for the itinerary",
      "destination": "${request.destination}, ${request.country}",
      "summary": "Brief summary of the itinerary",
      "days": [
        {
          "day": 1,
          "title": "Title for day 1",
          "schedule": [
            {
              "time": "Time slot",
              "activity": "Name of activity",
              "description": "Detailed description",
              "location": "Location name",
              "cost": "Estimated cost per person"
            }
          ],
          "notes": "Special notes about this day"
        }
      ],
      "tips": ["Tip 1", "Tip 2", "Tip 3"],
      "estimatedTotalCost": "Estimated total cost per person"
    }
    
    Include at least 4-6 activities per day, with a mix of daytime and nighttime activities.
    For a luxury budget, include high-end clubs, restaurants, and experiences.
    For a standard budget, include mid-range options that are still fun and memorable.
    For a budget option, include affordable alternatives that are still exciting.
    
    Make sure each day has a good flow and make the schedule realistic with travel time between venues.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert bachelor party planner who knows all the best venues, clubs, restaurants, and activities in popular destinations worldwide."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
  
      const itineraryText = response.choices[0].message.content;
      if (!itineraryText) {
        console.log("Empty response from OpenAI, using fallback itinerary");
        return generateFallbackItinerary(request);
      }
  
      try {
        return JSON.parse(itineraryText) as GeneratedItinerary;
      } catch (parseError) {
        console.error("Error parsing JSON from OpenAI response:", parseError);
        return generateFallbackItinerary(request);
      }
    } catch (openaiError) {
      console.error("OpenAI API error, using fallback itinerary:", openaiError);
      return generateFallbackItinerary(request);
    }
  } catch (error) {
    console.error("Error in generateItinerary function:", error);
    // Ritorna comunque un itinerario di fallback in caso di errore
    return generateFallbackItinerary(request);
  }
}