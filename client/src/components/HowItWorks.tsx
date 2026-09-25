import { useEffect } from "react";
import { MessageCircle, Search, Users } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

type Brand = 'bro' | 'bride';

interface HowItWorksProps {
  brand?: Brand;
}

const COPY = {
  bro: {
    titleKey: "howItWorks.bro.title",
    subtitleKey: "howItWorks.bro.subtitle",
    bookTextKey: "howItWorks.bro.bookText"
  },
  bride: {
    titleKey: "howItWorks.bride.title",
    subtitleKey: "howItWorks.bride.subtitle",
    bookTextKey: "howItWorks.bride.bookText"
  }
};

const STEPS = [
  {
    titleKey: "howItWorks.step1.title",
    descriptionKey: "howItWorks.step1.desc",
    Icon: MessageCircle,
  },
  {
    titleKey: "howItWorks.step2.title",
    descriptionKey: "howItWorks.step2.desc",
    Icon: Search,
  },
  {
    titleKey: "howItWorks.step3.title",
    descriptionKey: undefined,
    Icon: Users,
  },
] as const;

export default function HowItWorks({ brand = 'bro' }: HowItWorksProps) {
  const { t } = useTranslation();
  const copy = COPY[brand];

  useEffect(() => {
    if (window.location.hash === '#how-it-works') {
      window.requestAnimationFrame(() => {
        document.getElementById('how-it-works')?.scrollIntoView?.({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }, []);
  
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-border bg-surface-muted py-16 sm:py-20 lg:py-24"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.025em] text-foreground sm:text-4xl">
            {t(copy.titleKey)}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            {t(copy.subtitleKey)}
          </p>
        </div>

        <ol className="relative mx-auto mt-12 grid max-w-5xl gap-10 before:absolute before:bottom-6 before:left-7 before:top-7 before:w-px before:bg-border before:content-[''] md:grid-cols-3 md:gap-8 md:before:bottom-auto md:before:left-[16.666%] md:before:right-[16.666%] md:before:top-7 md:before:h-px md:before:w-auto lg:mt-16">
          {STEPS.map(({ titleKey, descriptionKey, Icon }, index) => (
            <li
              key={titleKey}
              className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-5 md:grid-cols-1 md:justify-items-center md:gap-0 md:text-center"
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-surface text-primary shadow-soft md:mb-6">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>

              <div>
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-xl font-bold leading-snug text-foreground">
                  {t(titleKey)}
                </h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  {t(descriptionKey ?? copy.bookTextKey)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
