import type { Brand } from "@/contexts/BrandContext";

export const EXPERIENCE_ARCHETYPES = [
  { id: "nightlife", broName: "The Ultimate BroNight", brideName: "The Ultimate BrideNight", sourceDescription: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures." },
  { id: "sport", broName: "My Olympic Bro", brideName: "My Olympic Bride", sourceDescription: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars." },
  { id: "relax", broName: "Chill and Feel the Bro", brideName: "Chill and Feel the Bride", sourceDescription: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours." },
  { id: "adventure", broName: "The Wild Broventure", brideName: "The Wild Brideventure", sourceDescription: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire." },
] as const;

export type ExperienceArchetypeId = (typeof EXPERIENCE_ARCHETYPES)[number]["id"];
type Translate = (key: string) => string;

export function getExperienceArchetype(name: string) {
  return EXPERIENCE_ARCHETYPES.find((item) => item.broName === name || item.brideName === name);
}

export function getExperienceArchetypeLabel(
  name: string,
  brand: Brand | "bro" | "bride" | null,
  t: Translate,
): string {
  const archetype = getExperienceArchetype(name);
  if (!archetype) return name;
  const brandKey = brand === "byebride" || brand === "bride" ? "bride" : "bro";
  return t(`experiences.archetype.${archetype.id}.name.${brandKey}`);
}

export function getExperienceArchetypeDescription(name: string, t: Translate): string | null {
  const archetype = getExperienceArchetype(name);
  return archetype ? t(`experiences.archetype.${archetype.id}.description`) : null;
}
