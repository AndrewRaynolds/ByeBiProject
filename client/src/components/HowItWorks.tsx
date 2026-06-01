import { Building, Map, GlassWater } from "lucide-react";
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

export default function HowItWorks({ brand = 'bro' }: HowItWorksProps) {
  const { t } = useTranslation();
  const copy = COPY[brand];
  const accentColor = brand === 'bride' ? 'border-pink-600 text-pink-600' : 'border-red-600 text-red-600';
  
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">{t(copy.titleKey)}</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">{t(copy.subtitleKey)}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <Building className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">{t('howItWorks.step1.title')}</h3>
            <p className="text-gray-300">{t('howItWorks.step1.desc')}</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <Map className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">{t('howItWorks.step2.title')}</h3>
            <p className="text-gray-300">{t('howItWorks.step2.desc')}</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <GlassWater className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">{t('howItWorks.step3.title')}</h3>
            <p className="text-gray-300">{t(copy.bookTextKey)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
