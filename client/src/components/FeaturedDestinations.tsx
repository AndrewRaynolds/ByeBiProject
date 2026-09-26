import { useQuery } from "@tanstack/react-query";
import { Destination } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { memo } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { useTranslation } from "@/contexts/LanguageContext";
import { localizeDestination } from "@/lib/localizeDestination";

// Ottimizzati i singoli componenti per evitare re-rendering
const DestinationCard = memo(({ destination }: { destination: Destination }) => {
  const { t } = useTranslation();
  const localizedDestination = localizeDestination(destination, t);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-shadow hover:shadow-raised">
      <div className="relative h-64 overflow-hidden">
        <OptimizedImage 
          src={destination.image} 
          alt={`${localizedDestination.name} - ${localizedDestination.country}`}
          width={400}
          height={300}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
          loadingMode="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-5 pt-16">
          <h3 className="text-xl font-bold text-background">{localizedDestination.name}</h3>
          <p className="text-sm text-background/90">{localizedDestination.country}</p>
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {localizedDestination.tags?.map((tag, index) => (
            <span 
              key={index} 
              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mb-4 mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{localizedDestination.description}</p>
        <div className="flex items-center justify-end">
          <Button variant="quiet" asChild className="text-primary hover:text-primary">
            <Link
              href={`/destinations/${destination.id}`}
              data-testid={`featured-destination-${destination.id}`}
            >
              {t("destinations.explore")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
});

DestinationCard.displayName = "DestinationCard";

type Brand = 'bro' | 'bride';

interface FeaturedDestinationsProps {
  brand?: Brand;
}

// Componente principale ottimizzato
const FeaturedDestinations = memo(function FeaturedDestinations({ brand = 'bro' }: FeaturedDestinationsProps) {
  const { t } = useTranslation();
  const { data: destinations, isLoading, error } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });
  
  if (isLoading) {
    return (
      <section className="border-b border-border bg-background py-16 sm:py-20 lg:py-24">
        <div className="page-container">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="mt-3 h-5 w-48" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
                <Skeleton className="h-64 w-full" />
                <div className="p-5">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mb-2 mt-4 h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="ml-auto mt-5 h-9 w-24" />
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
      <section className="border-b border-border bg-background py-16 sm:py-20 lg:py-24">
        <div className="page-container">
          <div className="rounded-2xl border border-border bg-surface-muted px-6 py-10 text-center shadow-soft">
            <h2 className="text-3xl font-bold tracking-[-0.025em] text-foreground sm:text-4xl">{t("destinations.popularTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("destinations.errorLoading")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-background py-16 sm:py-20 lg:py-24">
      <div className="page-container">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-[-0.025em] text-foreground sm:text-4xl">{t("destinations.popularTitle")}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">{t(brand === "bride" ? "destinations.popularSubtitleBride" : "destinations.popularSubtitleBro")}</p>
          </div>
          <Button variant="outline" asChild className="hidden shrink-0 md:inline-flex">
            <Link href="/destinations">{t("destinations.viewAll")}</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {destinations?.slice(0, 3).map((destination) => (
            <DestinationCard 
              key={destination.id} 
              destination={destination} 
            />
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/destinations">{t("destinations.viewAll")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
});

export default FeaturedDestinations;
