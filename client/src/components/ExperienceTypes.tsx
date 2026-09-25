import { useQuery } from "@tanstack/react-query";
import { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Locale, useTranslation } from "@/contexts/LanguageContext";

type Brand = 'bro' | 'bride';

interface ExperienceTypesProps {
  brand?: Brand;
}

const COPY = {
  bro: {
    titleKey: "experiences.exploreTitle",
    subtitleKey: "experiences.exploreSubtitleBro"
  },
  bride: {
    titleKey: "experiences.exploreTitle",
    subtitleKey: "experiences.exploreSubtitleBride"
  }
};

const EXPERIENCE_NAME_MAP: Record<string, string> = {
  "The Ultimate BroNight": "The Ultimate BrideNight",
  "My Olympic Bro": "My Olympic Bride",
  "Chill and Feel the Bro": "Chill and Feel the Bride",
  "The Wild Broventure": "The Wild Brideventure"
};

type LocalizedExperience = { name: string; description: string };

const EXPERIENCE_COPY: Record<string, {
  sourceDescription: string;
  it: LocalizedExperience;
  es: LocalizedExperience;
}> = {
  "The Ultimate BroNight": {
    sourceDescription: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
    it: { name: "La notte definitiva tra Bro", description: "Un tour epico tra club, locali esclusivi, casinò e avventure indimenticabili all'insegna della festa." },
    es: { name: "La noche definitiva entre Bros", description: "Una ruta épica por clubes, locales exclusivos, casinos y aventuras inolvidables llenas de fiesta." },
  },
  "The Ultimate BrideNight": {
    sourceDescription: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
    it: { name: "La notte definitiva tra amiche", description: "Un tour epico tra club, locali esclusivi, casinò e avventure indimenticabili all'insegna della festa." },
    es: { name: "La noche definitiva entre amigas", description: "Una ruta épica por clubes, locales exclusivos, casinos y aventuras inolvidables llenas de fiesta." },
  },
  "My Olympic Bro": {
    sourceDescription: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars.",
    it: { name: "Le Olimpiadi dei Bro", description: "Attività sportive adrenaliniche, eventi dal vivo, sfide competitive e bar pieni di energia." },
    es: { name: "Las Olimpiadas de los Bros", description: "Actividades deportivas emocionantes, eventos en directo, retos competitivos y bares llenos de energía." },
  },
  "My Olympic Bride": {
    sourceDescription: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars.",
    it: { name: "Le Olimpiadi delle amiche", description: "Attività sportive adrenaliniche, eventi dal vivo, sfide competitive e bar pieni di energia." },
    es: { name: "Las Olimpiadas de las amigas", description: "Actividades deportivas emocionantes, eventos en directo, retos competitivos y bares llenos de energía." },
  },
  "Chill and Feel the Bro": {
    sourceDescription: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours.",
    it: { name: "Relax da Bro", description: "Esperienze raffinate e rilassanti, ristoranti chic, cocktail bar e tour eleganti della città." },
    es: { name: "Relax entre Bros", description: "Experiencias relajadas y exclusivas, restaurantes chic, bares sofisticados y elegantes recorridos por la ciudad." },
  },
  "Chill and Feel the Bride": {
    sourceDescription: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours.",
    it: { name: "Relax tra amiche", description: "Esperienze raffinate e rilassanti, ristoranti chic, cocktail bar e tour eleganti della città." },
    es: { name: "Relax entre amigas", description: "Experiencias relajadas y exclusivas, restaurantes chic, bares sofisticados y elegantes recorridos por la ciudad." },
  },
  "The Wild Broventure": {
    sourceDescription: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
    it: { name: "La Bro-avventura selvaggia", description: "Un'ultima avventura sfrenata con i tuoi amici: attività all'aperto, trekking, campeggio e birre attorno al fuoco." },
    es: { name: "La aventura salvaje de los Bros", description: "Una última aventura salvaje con tus amigos: actividades al aire libre, senderismo, acampada y cervezas junto al fuego." },
  },
  "The Wild Brideventure": {
    sourceDescription: "One last wild adventure with your friends - outdoor activities, hiking, camping, and beers by the fire.",
    it: { name: "L'avventura selvaggia delle amiche", description: "Un'ultima avventura sfrenata con le tue amiche: attività all'aperto, trekking, campeggio e birre attorno al fuoco." },
    es: { name: "La aventura salvaje de las amigas", description: "Una última aventura salvaje con tus amigas: actividades al aire libre, senderismo, acampada y cervezas junto al fuego." },
  },
};

export function adaptExperienceForBrand<T extends { name: string; description: string }>(
  experience: T,
  brand: Brand,
): T {
  if (brand !== 'bride') return experience;
  return {
    ...experience,
    name: EXPERIENCE_NAME_MAP[experience.name] ?? experience.name,
    description: experience.description.replace(/\bbros\b/gi, 'friends'),
  };
}

export function localizeExperience<T extends { name: string; description: string }>(
  experience: T,
  locale: Locale,
): T {
  if (locale === 'en') return experience;
  const copy = EXPERIENCE_COPY[experience.name];
  if (!copy || copy.sourceDescription !== experience.description) return experience;
  return { ...experience, ...copy[locale] };
}

export default function ExperienceTypes({ brand = 'bro' }: ExperienceTypesProps) {
  const { locale, t } = useTranslation();
  const { data: experiences, isLoading, error } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });
  
  const copy = COPY[brand];
  const mappedExperiences = experiences?.map((experience) =>
    localizeExperience(adaptExperienceForBrand(experience, brand), locale),
  );

  if (isLoading) {
    return (
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-3" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface shadow-md">
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-36 mb-4" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
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
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-3 font-poppins text-3xl font-bold text-foreground md:text-4xl">{t(copy.titleKey)}</h2>
            <p className="text-muted-foreground">{t('experiences.errorLoading')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="mb-3 font-poppins text-3xl font-bold text-foreground md:text-4xl">{t(copy.titleKey)}</h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">{t(copy.subtitleKey)}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mappedExperiences?.map((experience) => (
            <div key={experience.id} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-md transition duration-300 hover:shadow-lg">
              <div className="h-48 overflow-hidden">
                <img 
                  src={experience.image} 
                  alt={experience.name} 
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                />
              </div>
              <div className="p-4">
                <h3 className="mb-2 font-poppins text-xl font-bold text-foreground">{experience.name}</h3>
                <p className="text-sm text-muted-foreground">{experience.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
