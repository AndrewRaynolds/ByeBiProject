export type ItineraryBudget = "economico" | "medio" | "alto";

interface ItineraryPreviewInput {
  city: string;
  startDate: string;
  endDate: string;
  people: number;
  interests: string[];
  budget: ItineraryBudget;
  content: string;
}

export function buildItineraryPreview(input: ItineraryPreviewInput) {
  const durationDays = Math.ceil(
    (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    name: `Addio al Celibato a ${input.city}`,
    description: input.content,
    duration: `${durationDays} giorni`,
    price:
      input.budget === "economico"
        ? 299
        : input.budget === "medio"
          ? 499
          : 799,
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300&q=80",
    rating: "5.0",
    highlights: [
      `${input.people} persone`,
      `Budget ${input.budget}`,
      `Destinazione: ${input.city}`,
    ],
    includes: [
      "Itinerario AI personalizzato",
      "Consigli locali",
      "Pianificazione ottimizzata",
    ],
  };
}
