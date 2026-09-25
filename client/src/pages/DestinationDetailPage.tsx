import { useQuery } from "@tanstack/react-query";
import type { Destination } from "@shared/schema";
import { ArrowLeft, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { Link, useParams } from "wouter";
import { AffiliateNotice } from "@/components/AffiliateNotice";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrand } from "@/contexts/BrandContext";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  adaptDestinationExperienceName,
  getDestinationCountryCode,
  getDestinationExperiences,
} from "@/lib/destinationExperiences";
import { openExternalUrl } from "@/lib/externalNavigation";
import { getGetYourGuideCityLink } from "@/lib/getyourguide";
import { localizeDestination } from "@/lib/localizeDestination";
import { trackAffiliateClick } from "@/lib/track";

export default function DestinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { brand } = useBrand();
  const { t } = useTranslation();
  const { data: destinations, isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const destination = destinations?.find((item) => String(item.id) === id);

  if (isLoading) {
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1} className="bg-background">
          <div className="page-container py-10 sm:py-14">
            <Skeleton className="mb-6 h-5 w-40 bg-surface-muted" />
            <Skeleton className="aspect-[16/9] w-full rounded-xl bg-surface-muted lg:aspect-[21/9]" />
            <Skeleton className="mt-8 h-10 w-64 bg-surface-muted" />
            <Skeleton className="mt-4 h-20 w-full max-w-3xl bg-surface-muted" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!destination) {
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1} className="bg-background">
          <div className="page-container py-20 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              {t("destinations.detailNotFound")}
            </h1>
            <Link
              href="/destinations"
              className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("destinations.back")}
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const localizedDestination = localizeDestination(destination, t);
  const recommendedExperiences = getDestinationExperiences(destination);
  const getYourGuideUrl = getGetYourGuideCityLink(destination.name);
  const plannerHref = `/?planDestination=${encodeURIComponent(localizedDestination.name)}`;

  const handleAffiliateClick = () => {
    if (!getYourGuideUrl) return;
    trackAffiliateClick({
      provider: "getyourguide",
      placement: "destinations",
      destination: destination.name,
      monetized: true,
    });
    openExternalUrl(getYourGuideUrl);
  };

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="bg-background">
        <article className="page-container py-8 sm:py-12">
          <Link
            href="/destinations"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("destinations.back")}
          </Link>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-raised">
            <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[16/8] lg:aspect-[21/9]">
              <img
                src={destination.image}
                alt={`${localizedDestination.name} - ${localizedDestination.country}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                <div className="mb-3 flex items-center gap-3">
                  <ReactCountryFlag
                    countryCode={getDestinationCountryCode(destination.country)}
                    svg
                    className="h-8 w-8 rounded-full shadow-soft"
                    aria-label={localizedDestination.country}
                  />
                  <span className="text-sm font-semibold text-primary-foreground/80">
                    {localizedDestination.country}
                  </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
                  {localizedDestination.name}
                </h1>
              </div>
            </div>

            <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                  {localizedDestination.description}
                </p>
                {localizedDestination.tags && localizedDestination.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {localizedDestination.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-surface-muted px-3 py-1 text-sm text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <section className="mt-10" aria-labelledby="destination-fit-title">
                  <h2 id="destination-fit-title" className="text-2xl font-bold text-foreground">
                    {t("destinations.fitTitle")}
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {recommendedExperiences.map((experienceName) => {
                      const brandedExperienceName = adaptDestinationExperienceName(
                        experienceName,
                        brand,
                      );
                      return (
                        <div
                          key={experienceName}
                          className="flex items-center gap-3 rounded-lg border border-border bg-brand-soft p-4 text-foreground"
                        >
                          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                          <span className="font-semibold">{brandedExperienceName}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside className="h-fit rounded-xl border border-border bg-surface-muted p-5 sm:p-6">
                <h2 className="text-xl font-bold text-foreground">
                  {t("destinations.planTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("destinations.planSubtitle", { city: localizedDestination.name })}
                </p>
                <Link
                  href={plannerHref}
                  data-testid="destination-plan-with-ai"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {t("destinations.planWithAi")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                {getYourGuideUrl && (
                  <div className="mt-5 border-t border-border pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleAffiliateClick}
                      data-testid="destination-getyourguide"
                    >
                      {t("destinations.discoverActivities")}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <AffiliateNotice variant="light" className="mt-3" />
                  </div>
                )}
              </aside>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
