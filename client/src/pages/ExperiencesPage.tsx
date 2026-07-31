import { useEffect, useMemo, useState } from "react";
import ExperienceTypes from "@/components/ExperienceTypes";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Header from "@/components/Header";
import {
  getAllCityExperiences,
  getItemsByCategory,
  type ExperienceCategory,
  type CityExperienceItem,
} from "@/lib/cityExperiences";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Utensils, Wine, Music, Compass, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/track";
import { useTranslation } from "@/contexts/LanguageContext";

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
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      data-testid={`item-experience-${item.category}-${index}`}
      className="group flex gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/40 rounded-xl transition-all"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-sm">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-white font-semibold leading-tight">{item.name}</h4>
          {item.isAffiliate && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] flex-shrink-0">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('experiences.affiliate')}
            </Badge>
          )}
        </div>
        <p className="text-white/60 text-sm mb-3">
          {locale === "it" ? item.description : t(`experiences.itemDescription.${item.category}`, { name: item.name, city: cityName })}
        </p>
        <Button
          onClick={handleClick}
          size="sm"
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
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
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const cities = useMemo(() => getAllCityExperiences(), []);
  const [selectedCityKey, setSelectedCityKey] = useState<string>(cities[0]?.cityKey ?? "");
  const [activeCategory, setActiveCategory] = useState<ExperienceCategory>("restaurants");

  const selectedCity = cities.find((c) => c.cityKey === selectedCityKey) ?? cities[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow">
        <section className="py-16 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-white">{t('experiences.title')}</h1>
              <p className="text-gray-300 max-w-3xl mx-auto">
                {t('experiences.subtitle')}
              </p>
            </div>
          </div>
        </section>

        <ExperienceTypes brand={isBride ? "bride" : "bro"} />

        <section className="py-16 bg-gradient-to-b from-black via-zinc-950 to-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {t('experiences.byCityTitle')}
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                {t('experiences.byCityDesc')}
              </p>
            </div>

            {selectedCity && (
              <>
                <div className="flex flex-wrap justify-center gap-2 mb-10" data-testid="city-selector">
                  {cities.map((city) => (
                    <button
                      key={city.cityKey}
                      onClick={() => {
                        setSelectedCityKey(city.cityKey);
                        trackEvent("city_experience_select", { cityKey: city.cityKey });
                      }}
                      data-testid={`button-select-city-${city.cityKey}`}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        city.cityKey === selectedCity.cityKey
                          ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                          : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      {t(`destinations.city.${cityTranslationKey(city.cityKey)}.name`)}
                    </button>
                  ))}
                </div>

                <Tabs
                  value={activeCategory}
                  onValueChange={(v) => setActiveCategory(v as ExperienceCategory)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-transparent h-auto mb-8">
                    {CATEGORY_ORDER.map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        data-testid={`tab-category-${cat}`}
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white bg-white/5 text-white/70 border border-white/10 py-3 flex items-center gap-2"
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
                          <h3 className="text-2xl font-bold text-white">
                            {t('experiences.categoryInCity', {
                              category: t(`experiences.category.${cat}`),
                              city: t(`destinations.city.${cityTranslationKey(selectedCity.cityKey)}.name`),
                            })}
                          </h3>
                          <span className="text-white/50 text-sm">
                            {t('experiences.resultsCount', {
                              count: items.length,
                              label: items.length === 1 ? t('common.result') : t('common.results'),
                            })}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <div className="text-center py-10 text-white/60">
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
