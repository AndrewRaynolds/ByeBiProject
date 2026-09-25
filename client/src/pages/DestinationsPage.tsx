import { useQuery } from "@tanstack/react-query";
import type { Destination } from "@shared/schema";
import { ArrowRight, Compass } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import ReactCountryFlag from "react-country-flag";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  adaptDestinationExperienceName,
  DESTINATION_INTENTS,
  destinationMatchesIntent,
  getDestinationCountryCode,
  getDestinationExperiences,
  type DestinationIntent,
} from "@/lib/destinationExperiences";
import { localizeDestination } from "@/lib/localizeDestination";

type DestinationIntentFilter = "all" | DestinationIntent;

export default function DestinationsPage() {
  const { t } = useTranslation();
  const [selectedIntent, setSelectedIntent] = useState<DestinationIntentFilter>("all");
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const { data: destinations, isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });
  const visibleDestinations =
    selectedIntent === "all"
      ? destinations ?? []
      : destinations?.filter((destination) =>
          destinationMatchesIntent(destination, selectedIntent),
        ) ?? [];
  const intentFilters: DestinationIntentFilter[] = ["all", ...DESTINATION_INTENTS];

  if (isLoading) {
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1} className="bg-background">
          <div className="page-container py-12 sm:py-16">
            <div className="mb-12 text-center">
              <Skeleton className="mx-auto h-12 w-64 bg-surface-muted" />
              <Skeleton className="mx-auto mt-3 h-5 w-full max-w-xl bg-surface-muted" />
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft"
                >
                  <Skeleton className="h-64 w-full bg-surface-muted" />
                  <div className="space-y-3 p-6">
                    <Skeleton className="h-6 w-40 bg-surface-muted" />
                    <Skeleton className="h-4 w-full bg-surface-muted" />
                    <Skeleton className="h-4 w-3/4 bg-surface-muted" />
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
      <main id="main-content" tabIndex={-1} className="bg-background">
        <section className="relative isolate overflow-hidden border-b border-border bg-surface py-16 sm:py-20">
          <div
            className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-soft blur-3xl"
            aria-hidden="true"
          />
          <div className="page-container relative text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
              <Compass className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t(isBride ? "destinations.heroTitleBride" : "destinations.heroTitleBro")}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {t(isBride ? "destinations.heroSubtitleBride" : "destinations.heroSubtitleBro")}
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="page-container">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold text-foreground">{t("destinations.allTitle")}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {t("destinations.allSubtitle")}
              </p>

              <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-5">
                <p className="text-sm font-semibold text-foreground">
                  {t("destinations.intentQuestion")}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label={t("destinations.intentQuestion")}
                >
                  {intentFilters.map((intent) => {
                    const isSelected = selectedIntent === intent;

                    return (
                      <button
                        key={intent}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedIntent(intent)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-brand-soft"
                        }`}
                      >
                        {t(`destinations.intent.${intent}`)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                  {t("destinations.resultCount", { count: visibleDestinations.length })}
                </p>
              </div>
            </div>

            {visibleDestinations.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {visibleDestinations.map((destination) => {
                  const localizedDestination = localizeDestination(destination, t);
                  const recommendedExperiences = getDestinationExperiences(destination);

                  return (
                    <Link
                      key={destination.id}
                      href={`/destinations/${destination.id}`}
                      aria-label={t("destinations.cardAria", {
                        city: localizedDestination.name,
                      })}
                      data-testid={`card-destination-${destination.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={destination.image}
                          alt={`${localizedDestination.name} - ${localizedDestination.country}`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <ReactCountryFlag
                          countryCode={getDestinationCountryCode(destination.country)}
                          svg
                          className="absolute left-4 top-4 h-7 w-7 rounded-full shadow-soft"
                          aria-label={localizedDestination.country}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 to-transparent p-5 pt-16">
                          <h3 className="text-xl font-bold text-primary-foreground">
                            {localizedDestination.name}
                          </h3>
                          <p className="text-sm text-primary-foreground/80">
                            {localizedDestination.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-4 flex flex-wrap gap-2">
                          {recommendedExperiences.map((experienceName) => (
                            <span
                              key={experienceName}
                              className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {adaptDestinationExperienceName(
                                experienceName,
                                isBride ? "byebride" : "byebro",
                              )}
                            </span>
                          ))}
                          {localizedDestination.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="line-clamp-3 leading-7 text-muted-foreground">
                          {localizedDestination.description}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary">
                          {t("destinations.viewDetails")}
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center shadow-soft">
                <h3 className="text-xl font-bold text-foreground">
                  {t("destinations.emptyTitle")}
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
                  {t("destinations.emptyBody")}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedIntent("all")}
                  className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("destinations.emptyReset")}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
