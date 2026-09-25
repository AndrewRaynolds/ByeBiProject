import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BedDouble,
  Plane,
  ReceiptText,
  Send,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Link } from "wouter";

type HomeHeroProps = {
  brand: "bro" | "bride";
  chatInput: string;
  inputTestId: string;
  buttonTestId: string;
  onChatInputChange: (value: string) => void;
  onChatSubmit: (event: React.FormEvent) => void;
};

const featureIcons = [Plane, BedDouble, Ticket, ReceiptText] as const;
const featureKeys = ["flights", "hotels", "activities", "expenses"] as const;

export default function HomeHero({
  brand,
  chatInput,
  inputTestId,
  buttonTestId,
  onChatInputChange,
  onChatSubmit,
}: HomeHeroProps) {
  const { t } = useTranslation();
  const isBride = brand === "bride";
  const translationRoot = `hero.${brand}`;

  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-background">
      <div
        className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-soft blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-52 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="page-container relative grid items-center gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1.02fr)_minmax(26rem,0.98fr)] lg:gap-16 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("hero.eyebrow")}
          </div>

          <h1 className="max-w-[13ch] text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
            {t(`${translationRoot}.title`)}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {t(`${translationRoot}.subtitle`)}
          </p>

          <div className="mt-7 flex flex-wrap gap-2" aria-label={t("hero.featuresLabel")}>
            {featureKeys.map((key, index) => {
              const Icon = featureIcons[index];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-soft"
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t(`hero.feature.${key}`)}
                </span>
              );
            })}
          </div>

          <nav className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" aria-label={t("hero.exploreLabel")}>
            <Link
              href="/destinations"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary"
            >
              {t("header.destinations")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/experiences"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary"
            >
              {t("header.experiences")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div
            className={cn(
              "absolute -inset-3 -rotate-2 rounded-[2rem] bg-primary/10",
              isBride && "rotate-2",
            )}
            aria-hidden="true"
          />
          <div className="relative rounded-[1.5rem] border border-border bg-surface p-5 shadow-raised sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {t(`${translationRoot}.chatTitle`)}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(`${translationRoot}.chatSubtitle`)}
                </p>
              </div>
            </div>

            <form onSubmit={onChatSubmit} className="space-y-3">
              <label htmlFor={inputTestId} className="sr-only">
                {t(`${translationRoot}.placeholder`)}
              </label>
              <Input
                id={inputTestId}
                type="text"
                autoComplete="off"
                placeholder={t(`${translationRoot}.placeholder`)}
                value={chatInput}
                onChange={(event) => onChatInputChange(event.target.value)}
                className="h-12 border-border-strong bg-background px-4 shadow-none"
                data-testid={inputTestId}
              />
              <Button type="submit" size="lg" className="h-12 w-full" data-testid={buttonTestId}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t(`${translationRoot}.startChat`)}
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
