import type { ItineraryRequest, DailyPlan, GeneratedItinerary } from "./openai";

// Funzione per generare itinerari di esempio in caso di fallback
export function generateFallbackItinerary(request: ItineraryRequest): GeneratedItinerary {
  console.log("Generando itinerario fallback per", request.destination, "con budget", request.budget);
  
  // Moltiplicatore di costo basato sul budget
  const budgetMultiplier = request.budget === "budget" ? 1 : request.budget === "standard" ? 1.6 : 2.5;
  const baseCost = 80 * budgetMultiplier;
  const totalPerDay = baseCost * request.groupSize;
  const totalCost = (totalPerDay * request.days).toFixed(0);
  
  // Dati specifici per Barcellona
  const barcelonaData = {
    brunch: [
      { name: "Brunch & Cake", location: "Carrer d'Enric Granados, 19", price: 25 },
      { name: "Milk Bar & Bistro", location: "Carrer d'en Gignàs, 21", price: 20 },
      { name: "Federal Café", location: "Carrer del Parlament, 39", price: 18 },
      { name: "Flax & Kale", location: "Carrer dels Tallers, 74b", price: 30 }
    ],
    bars: [
      { name: "Espit Chupitos", location: "Carrer d'Aribau, 77", price: 30, description: "Famous shots bar with hundreds of different creative shots" },
      { name: "Dow Jones Bar", location: "Carrer del Bruc, 97", price: 35, description: "Bar where drink prices fluctuate based on demand, like a stock market" },
      { name: "CocoVail Beer Hall", location: "Carrer d'Aragó, 284", price: 40, description: "American-style beer hall with a wide selection of craft beers" },
      { name: "Bobby's Free", location: "Carrer de Pau Claris, 85", price: 45, description: "Speakeasy cocktail bar hidden behind a barbershop façade" },
      { name: "Dr. Stravinsky", location: "Carrer dels Mirallers, 5", price: 50, description: "Innovative cocktail bar with lab-like atmosphere and unique drinks" }
    ],
    nightclubs: [
      { name: "Opium Barcelona", location: "Passeig Marítim, 34", price: 60, description: "Beachfront superclub with international DJs and ocean views" },
      { name: "Pacha Barcelona", location: "Passeig Marítim, 38", price: 65, description: "Barcelona outpost of the famous Ibiza club" },
      { name: "Razzmatazz", location: "Carrer dels Almogàvers, 122", price: 50, description: "Huge multi-room club with different music styles in each space" },
      { name: "Shôko", location: "Passeig Marítim, 36", price: 70, description: "Beachfront restaurant that transforms into a high-energy nightclub" },
      { name: "Sala Apolo", location: "Carrer Nou de la Rambla, 113", price: 40, description: "Historic venue with different themed nights" }
    ],
    restaurants: [
      { name: "Ciudad Condal", location: "Rambla de Catalunya, 18", price: 45, description: "Popular tapas bar with a wide variety of Spanish cuisine" },
      { name: "Cervecería Catalana", location: "Carrer de Mallorca, 236", price: 40, description: "Bustling tapas bar serving Spanish classics" },
      { name: "El Nacional", location: "Passeig de Gràcia, 24", price: 65, description: "Multi-space culinary experience with different food areas" },
      { name: "Botafumeiro", location: "Carrer Gran de Gràcia, 81", price: 90, description: "Upscale seafood restaurant favored by celebrities" },
      { name: "Can Culleretes", location: "Carrer d'en Quintana, 5", price: 50, description: "The oldest restaurant in Barcelona (since 1786)" }
    ],
    activities: [
      { name: "Boat Party Barcelona", location: "Port Olímpic", price: 80, description: "3-hour party cruise with drinks and music along the coast" },
      { name: "Barça Stadium Tour", location: "C. d'Arístides Maillol, 12", price: 35, description: "Tour of Camp Nou, the legendary FC Barcelona stadium" },
      { name: "Beach Club Day", location: "W Barcelona, Plaça Rosa Del Vents, 1", price: 100, description: "Day beds, cocktails and beach service at a premium beach club" },
      { name: "Montjuïc Cable Car", location: "Av. Miramar, 30", price: 15, description: "Scenic cable car ride offering panoramic views of the city" },
      { name: "Cooking Class", location: "Barcelona Cooking, La Rambla, 91", price: 70, description: "Interactive paella and tapas cooking class with drinks" }
    ],
    tips: [
      "Barcelona's nightlife usually doesn't pick up until after midnight, so plan accordingly",
      "The metro stops running at midnight Sunday to Thursday, and at 2 AM on Friday nights",
      "Reserve tables at popular clubs in advance to avoid waiting in long lines",
      "Taxis are plentiful and relatively affordable for late-night transportation",
      "Pickpocketing can be common in touristy areas, especially La Rambla, so stay alert",
      "Most bars in Barcelona have happy hour specials from 6-8 PM",
      "Clubs often have a free guest list you can join online before 1 AM",
      "Keep a copy of your hotel address in Spanish to show taxi drivers"
    ]
  };
  
  // Set per tenere traccia dei luoghi usati per evitare duplicati
  const usedPlaces = new Set<string>();
  
  // Funzione per selezionare un elemento casuale da un array senza ripetizioni
  const getUniqueRandom = <T extends { name: string }>(array: T[]): T => {
    const availableOptions = array.filter(item => !usedPlaces.has(item.name));
    if (availableOptions.length === 0) {
      // Se abbiamo usato tutte le opzioni, ripristiniamo
      usedPlaces.clear();
      return array[Math.floor(Math.random() * array.length)];
    }
    const selected = availableOptions[Math.floor(Math.random() * availableOptions.length)];
    usedPlaces.add(selected.name);
    return selected;
  };
  
  // Temi diversi per ogni giorno
  const dayThemes = [
    "The Perfect Introduction",
    "Local Culture Immersion",
    "Beach & Party Day",
    "Final Celebration"
  ];
  
  // Crea giorni diversi per l'itinerario
  const createDayPlan = (dayNum: number): DailyPlan => {
    const dayActivities = [];
    
    // MATTINA
    if (dayNum === 1) {
      // Primo giorno: check-in e introduzione alla città
      dayActivities.push({
        time: "11:00",
        activity: "Check-in & Welcome Drinks",
        description: "Arrive at your accommodation, check in, and enjoy welcome drinks while planning your adventure",
        location: "Your Accommodation in Barcelona",
        cost: `€${(15 * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Brunch di recupero
      const brunchSpot = getUniqueRandom(barcelonaData.brunch);
      dayActivities.push({
        time: "11:00",
        activity: `Recovery Brunch at ${brunchSpot.name}`,
        description: "Start the day with a late, hearty brunch to recover from the previous night's activities",
        location: brunchSpot.location,
        cost: `€${(brunchSpot.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // POMERIGGIO
    if (dayNum === 1) {
      // Primo giorno: tour orientativo
      dayActivities.push({
        time: "14:00",
        activity: "Bachelor Party Kickoff Tour",
        description: "A guided walking tour of Barcelona's best bachelor party spots with a local expert",
        location: "Gothic Quarter",
        cost: `€${(30 * budgetMultiplier).toFixed(0)} per person`
      });
    } else if (dayNum === request.days) {
      // Ultimo giorno: attività speciale
      const activity = barcelonaData.activities[0]; // Boat party
      dayActivities.push({
        time: "14:00",
        activity: activity.name,
        description: activity.description,
        location: activity.location,
        cost: `€${(activity.price * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Altri giorni: attività varie
      const activity = getUniqueRandom(barcelonaData.activities);
      dayActivities.push({
        time: "15:00",
        activity: activity.name,
        description: activity.description,
        location: activity.location,
        cost: `€${(activity.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // SERA: Bar Crawl o Cena
    if (request.interests.includes("barCrawl")) {
      // Se hanno selezionato bar crawl
      const startBar = getUniqueRandom(barcelonaData.bars);
      const secondBar = getUniqueRandom(barcelonaData.bars);
      
      dayActivities.push({
        time: "19:30",
        activity: `Bar Crawl Starting at ${startBar.name}`,
        description: `Begin your epic bar crawl at ${startBar.name} (${startBar.description}), followed by ${secondBar.name} and more`,
        location: startBar.location,
        cost: `€${((startBar.price + secondBar.price) * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Altrimenti, cena in ristorante
      const restaurant = getUniqueRandom(barcelonaData.restaurants);
      dayActivities.push({
        time: "20:00",
        activity: `Group Dinner at ${restaurant.name}`,
        description: restaurant.description,
        location: restaurant.location,
        cost: `€${(restaurant.price * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // NOTTE
    if (request.interests.includes("nightclubs")) {
      const club = getUniqueRandom(barcelonaData.nightclubs);
      dayActivities.push({
        time: "00:00",
        activity: `VIP Night at ${club.name}`,
        description: `${club.description} with VIP table service and bottle service`,
        location: club.location,
        cost: `€${(club.price * 2 * budgetMultiplier).toFixed(0)} per person`
      });
    } else {
      // Fallback per chi non ha selezionato locali notturni
      const bar = getUniqueRandom(barcelonaData.bars);
      dayActivities.push({
        time: "22:00",
        activity: `Premium Experience at ${bar.name}`,
        description: bar.description,
        location: bar.location,
        cost: `€${(bar.price * 1.5 * budgetMultiplier).toFixed(0)} per person`
      });
    }
    
    // Genera il giorno formattato
    return {
      day: dayNum,
      title: `Day ${dayNum}: ${dayThemes[Math.min(dayNum - 1, dayThemes.length - 1)]}`,
      schedule: dayActivities,
      notes: dayNum === 1
        ? "Start your bachelor party adventure with a perfect introduction to Barcelona's vibrant scene."
        : dayNum === request.days
        ? "Make your final day in Barcelona an epic celebration to remember!"
        : "Continue exploring Barcelona's incredible nightlife and culture."
    };
  };
  
  // Crea un giorno per ciascun giorno richiesto
  const days = [];
  for (let i = 1; i <= request.days; i++) {
    days.push(createDayPlan(i));
  }
  
  // Calcola il costo stimato totale basato sulle attività
  let totalEstimated = 0;
  days.forEach(day => {
    day.schedule.forEach(activity => {
      if (activity.cost) {
        const costMatch = activity.cost.match(/€(\d+)/);
        if (costMatch && costMatch[1]) {
          totalEstimated += parseInt(costMatch[1], 10);
        }
      }
    });
  });
  
  // Arrotonda il totale a multipli di 50
  totalEstimated = Math.ceil(totalEstimated / 50) * 50;
  
  return {
    title: `${request.theme} in ${request.destination}`,
    destination: `${request.destination}, ${request.country}`,
    summary: `An unforgettable ${request.days}-day bachelor party in ${request.destination}, featuring the best nightlife, activities, and experiences tailored for a group of ${request.groupSize}. Experience the vibrant atmosphere of Barcelona's famous nightlife with a carefully curated plan that fits your ${request.budget} budget.`,
    days: days,
    tips: barcelonaData.tips.slice(0, 5),
    estimatedTotalCost: `€${totalEstimated} per person`
  };
}

