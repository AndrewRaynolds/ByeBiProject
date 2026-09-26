import { useQuery } from "@tanstack/react-query";
import { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  getExperienceArchetype,
  getExperienceArchetypeDescription,
  getExperienceArchetypeLabel,
} from "@/lib/experienceArchetypes";

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

export function adaptExperienceForBrand<T extends { name: string; description: string }>(
  experience: T,
  brand: Brand,
): T {
  if (brand !== 'bride') return experience;
  return {
    ...experience,
    name: getExperienceArchetype(experience.name)?.brideName ?? experience.name,
    description: experience.description.replace(/\bbros\b/gi, 'friends'),
  };
}

export function localizeExperience<T extends { name: string; description: string }>(
  experience: T,
  locale: "it" | "en" | "es",
  t?: (key: string) => string,
): T {
  if (locale === "en") return experience;
  const archetype = getExperienceArchetype(experience.name);
  if (!archetype || !t) return experience;
  const brand = experience.name === archetype.brideName ? "bride" : "bro";
  const expectedDescription = brand === "bride"
    ? archetype.sourceDescription.replace(/\bbros\b/gi, "friends")
    : archetype.sourceDescription;
  return {
    ...experience,
    name: getExperienceArchetypeLabel(experience.name, brand, t),
    description: experience.description === expectedDescription
      ? getExperienceArchetypeDescription(experience.name, t) ?? experience.description
      : experience.description,
  };
}

export default function ExperienceTypes({ brand = 'bro' }: ExperienceTypesProps) {
  const { locale, t } = useTranslation();
  const { data: experiences, isLoading, error, refetch, isFetching } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });
  
  const copy = COPY[brand];
  const mappedExperiences = experiences?.map((experience) =>
    localizeExperience(adaptExperienceForBrand(experience, brand), locale, t),
  );

  if (isLoading) {
    return (
      <section className="bg-background py-16" role="status" aria-label={t("common.loading")}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-3" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
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
      <section className="bg-background py-16" role="alert">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-3 font-poppins text-3xl font-bold text-foreground md:text-4xl">{t(copy.titleKey)}</h2>
            <p className="text-muted-foreground">{t('experiences.errorLoading')}</p>
            <Button className="mt-5" disabled={isFetching} onClick={() => void refetch()}>{t("common.retry")}</Button>
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
        
        {mappedExperiences?.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted-foreground">{t("experiences.emptyTypes")}</p>
        ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mappedExperiences?.map((experience) => (
            <div key={experience.id} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition duration-300 hover:shadow-raised">
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
        </div>}
      </div>
    </section>
  );
}
