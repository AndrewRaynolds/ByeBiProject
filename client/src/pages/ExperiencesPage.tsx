import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import ExperienceTypes from "@/components/ExperienceTypes";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Header from "@/components/Header";
import {
  getAllCityExperiences,
  getItemsByCategory,
  getSupportedCityKey,
  type ExperienceCategory,
  type CityExperienceItem,
} from "@/lib/cityExperiences";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, Utensils, Wine, Music, Compass, Sparkles } from "lucide-react";
import { trackAffiliateClick, trackEvent } from "@/lib/track";
import { useBrand } from "@/contexts/BrandContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { openExternalUrl } from "@/lib/externalNavigation";
import { AffiliateNotice } from "@/components/AffiliateNotice";

const CATEGORY_ORDER: ExperienceCategory[] = ["restaurants", "bars", "nightlife", "activities"];
const cityTranslationKey = (cityKey: string) => cityKey === "palma-de-mallorca" ? "palma" : cityKey;

const CATEGORY_ICONS: Record<ExperienceCategory, JSX.Element> = {
  restaurants: <Utensils className="w-4 h-4" />,
  bars: <Wine className="w-4 h-4" />,
  nightlife: <Music className="w-4 h-4" />,
  activities: <Compass className="w-4 h-4" />,
};

function ExperienceItemCard({ item, index, cityName }: { item: CityExperienceItem; index: number; cityName: string }) {
  const { t, locale } = useTranslation();
  const handleClick = () => {
    trackEvent("city_experience_click", {
      itemName: item.name,
      category: item.category,
      isAffiliate: item.isAffiliate,
      source: item.source,
      url: item.url,
    });
    if (item.source === "getyourguide" && item.isAffiliate) {
      trackAffiliateClick({
        provider: "getyourguide",
        placement: "experiences",
        destination: cityName,
        monetized: true,
      });
    }
    openExternalUrl(item.url);
  };

  return (
    <div
      data-testid={`item-experience-${item.category}-${index}`}
      className="group flex h-full gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft transition duration-300 hover:border-primary/30 hover:shadow-raised sm:p-5"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-brand-soft text-primary">
        {CATEGORY_ICONS[item.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold leading-tight text-foreground">{item.name}</h4>
          {item.isAffiliate && (
            <Badge variant="brand" className="flex-shrink-0 text-[10px]">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('experiences.affiliate')}
            </Badge>
          )}
        </div>
        <p className="mb-3 text-sm leading-6 text-muted-foreground">
          {locale === "it" ? item.description : t(`experiences.itemDescription.${item.category}`, { name: item.name, city: cityName })}
        </p>
        <Button
          onClick={handleClick}
          size="sm"
          variant="external"
          data-testid={`button-open-experience-${item.category}-${index}`}
        >
          {item.source === "getyourguide" ? t('experiences.bookGyg') : t('experiences.openMaps')}
          <ExternalLink className="w-3.5 h-3.5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const { brand } = useBrand();
  const isBride = brand === "byebride";
  const cities = useMemo(() => getAllCityExperiences(), []);
  const [selectedCityKey, setSelectedCityKey] = useState<string>(() => {
    const requestedCity = new URLSearchParams(window.location.search).get("city");
    return getSupportedCityKey(requestedCity) ?? cities[0]?.cityKey ?? "";
  });
  const [activeCategory, setActiveCategory] = useState<ExperienceCategory>("restaurants");

  const selectedCity = cities.find((c) => c.cityKey === selectedCityKey) ?? cities[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow bg-background">
        <section className="relative isolate overflow-hidden border-b border-border bg-surface py-16 sm:py-20">
          <div
            className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-soft blur-3xl"
            aria-hidden="true"
          />
          <div className="page-container relative text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t('experiences.title')}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {t('experiences.subtitle')}
            </p>
          </div>
        </section>

        <ExperienceTypes brand={isBride ? "bride" : "bro"} />

        <section className="border-t border-border bg-surface-muted py-14 sm:py-16">
          <div className="page-container">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {t('experiences.byCityTitle')}
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {t('experiences.byCityDesc')}
              </p>
              {activeCategory === "activities" && (
                <AffiliateNotice variant="light" className="mt-4 justify-center" />
              )}
            </div>

            {selectedCity && (
              <>
                <div className="mb-8 rounded-xl border border-border bg-surface p-4 shadow-soft sm:p-5">
                  <p className="text-sm font-semibold text-foreground">
                    {t('experiences.citySelectorLabel')}
                  </p>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    data-testid="city-selector"
                    role="group"
                    aria-label={t('experiences.citySelectorLabel')}
                  >
                    {cities.map((city) => {
                      const isSelected = city.cityKey === selectedCity.cityKey;

                      return (
                        <button
                          key={city.cityKey}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedCityKey(city.cityKey);
                            trackEvent("city_experience_select", { cityKey: city.cityKey });
                          }}
                          data-testid={`button-select-city-${city.cityKey}`}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-soft"
                              : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-brand-soft"
                          }`}
                        >
                          {t(`destinations.city.${cityTranslationKey(city.cityKey)}.name`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Tabs
                  value={activeCategory}
                  onValueChange={(v) => setActiveCategory(v as ExperienceCategory)}
                  className="w-full"
                >
                  <TabsList
                    aria-label={t('experiences.categoriesLabel')}
                    className="mb-8 grid h-auto grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-2 shadow-soft md:grid-cols-4"
                  >
                    {CATEGORY_ORDER.map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        data-testid={`tab-category-${cat}`}
                        className="flex min-h-11 items-center gap-2 border border-transparent bg-background py-3 text-foreground hover:border-primary/30 hover:bg-brand-soft data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft"
                      >
                        {CATEGORY_ICONS[cat]}
                        <span>{t(`experiences.category.${cat}`)}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {CATEGORY_ORDER.map((cat) => {
                    const items = getItemsByCategory(selectedCity, cat);
                    return (
                      <TabsContent key={cat} value={cat} className="mt-0">
                        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
                          <h3 className="text-2xl font-bold text-foreground">
                            {t('experiences.categoryInCity', {
                              category: t(`experiences.category.${cat}`),
                              city: t(`destinations.city.${cityTranslationKey(selectedCity.cityKey)}.name`),
                            })}
                          </h3>
                          <span className="text-sm text-muted-foreground" aria-live="polite">
                            {t('experiences.resultsCount', {
                              count: items.length,
                              label: items.length === 1 ? t('common.result') : t('common.results'),
                            })}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <div className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
                            {t('experiences.emptyCategory')}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map((item, idx) => (
                              <ExperienceItemCard
                                key={`${item.name}-${idx}`}
                                item={item}
                                index={idx}
                                cityName={t(`destinations.city.${cityTranslationKey(selectedCity.cityKey)}.name`)}
                              />
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>

                <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl border border-border bg-brand-soft p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {t('experiences.destinationsCtaTitle')}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {t('experiences.destinationsCtaDescription')}
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href="/destinations" data-testid="experiences-destinations-link">
                      {t('experiences.destinationsCta')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
