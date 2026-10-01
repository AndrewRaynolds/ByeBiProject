import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, ExternalLink } from 'lucide-react';
import { getGetYourGuideCityLink } from '@/lib/getyourguide';
import { trackAffiliateClick } from '@/lib/track';
import { useTranslation } from '@/contexts/LanguageContext';
import { openExternalUrl } from '@/lib/externalNavigation';
import { AffiliateNotice } from '@/components/AffiliateNotice';

interface GetYourGuideCtaProps {
  destinationCity?: string;
  placement: "itinerary" | "checkout";
  tripId?: string;
}

export function GetYourGuideCta({ destinationCity, placement, tripId }: GetYourGuideCtaProps) {
  const { t } = useTranslation();
  const url = getGetYourGuideCityLink(destinationCity);

  if (!url) {
    return null;
  }

  const handleClick = () => {
    trackAffiliateClick({
      provider: "getyourguide",
      placement: placement === "checkout" ? "checkout_experiences" : "itinerary",
      destination: destinationCity,
      monetized: true,
    });
    openExternalUrl(url);
  };

  return (
    <Card className="border-2 border-primary/30 bg-card shadow-soft">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary p-3 text-primary-foreground flex-shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-card-foreground mb-1">
              {t('gyg.title', { city: destinationCity || '' })}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('gyg.subtitle')}
            </p>
            <AffiliateNotice className="mb-4" variant="light" />
            <Button
              onClick={handleClick}
              className="h-auto min-h-11 w-full whitespace-normal text-center font-semibold leading-tight sm:w-auto"
              data-testid={`button-gyg-${placement}`}
            >
              <Compass className="w-4 h-4 mr-2" />
              {t('gyg.cta')}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GetYourGuideCta;
