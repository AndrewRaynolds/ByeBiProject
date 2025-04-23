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

export async function generateItinerary(request: ItineraryRequest): Promise<GeneratedItinerary> {
  try {
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
      throw new Error("Failed to generate itinerary - empty response");
    }

    try {
      const generatedItinerary = JSON.parse(itineraryText) as GeneratedItinerary;
      return generatedItinerary;
    } catch (error) {
      console.error("Error parsing JSON from OpenAI response:", error);
      throw new Error("Failed to parse itinerary JSON");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}