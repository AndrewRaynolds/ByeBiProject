import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, ExternalLink } from 'lucide-react';
import { getGetYourGuideCityLink } from '@/lib/getyourguide';
import { trackEvent } from '@/lib/track';
import { useTranslation } from '@/contexts/LanguageContext';

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
    trackEvent("gyg_click", {
      destinationCity,
      placement,
      tripId,
      url
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="bg-gradient-to-br from-orange-900/30 to-amber-900/30 backdrop-blur-sm border-2 border-orange-500/50 shadow-xl">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg flex-shrink-0">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">
              {t('gyg.title', { city: destinationCity || '' })}
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {t('gyg.subtitle')}
            </p>
            <Button
              onClick={handleClick}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
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
