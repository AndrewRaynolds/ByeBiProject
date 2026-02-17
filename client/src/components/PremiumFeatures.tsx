import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";

type Brand = 'bro' | 'bride';

interface PremiumFeaturesProps {
  brand?: Brand;
}

export default function PremiumFeatures({ brand = 'bro' }: PremiumFeaturesProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isPremium = user?.isPremium || false;

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      toast({
        title: t('premium.authRequired'),
        description: t('premium.authRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", `/api/users/${user?.id}/premium`, {
        isPremium: true
      });
      
      const updatedUser = await response.json();
      updateUser(updatedUser);
      
      toast({
        title: t('premium.upgradeSuccess'),
        description: `${t('premium.upgradeSuccessDesc')}${selectedPlan === "annual" ? t('premium.upgradeSuccessAnnual') : ""}`,
      });
      
      // Invalidate queries that depend on premium status
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      
    } catch (error) {
      toast({
        title: t('premium.upgradeFailed'),
        description: t('premium.upgradeFailedDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <section id="premium-features" className="py-16 bg-gradient-to-r from-red-600 to-red-700">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">{t('premium.title')}</h2>
          <p className="text-white opacity-90 max-w-3xl mx-auto">{brand === 'bride' ? t('premium.bride.subtitle') : t('premium.bro.subtitle')}</p>
        </div>
        
        <div className="max-w-4xl mx-auto bg-black rounded-xl overflow-hidden shadow-xl border border-red-600">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="p-8 bg-gray-900">
              <h3 className="text-2xl font-bold mb-6 font-poppins text-white">{t('premium.benefitsTitle')}</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-red-600 mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium text-white">{t(`premium.${brand}.blogTitle`)}</span>
                    <p className="text-sm text-gray-300 mt-1">{t(`premium.${brand}.blogDesc`)}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-red-600 mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium text-white">{t(`premium.${brand}.avatarTitle`)}</span>
                    <p className="text-sm text-gray-300 mt-1">{t(`premium.${brand}.avatarDesc`)}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-red-600 mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium text-white">{t('premium.itineraryTitle')}</span>
                    <p className="text-sm text-gray-300 mt-1">{t('premium.itineraryDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-red-600 mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium text-white">{t('premium.discountsTitle')}</span>
                    <p className="text-sm text-gray-300 mt-1">{t('premium.discountsDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-red-600 mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium text-white">{t('premium.supportTitle')}</span>
                    <p className="text-sm text-gray-300 mt-1">{t('premium.supportDesc')}</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="col-span-2 p-8 bg-black">
              <h3 className="text-2xl font-bold mb-6 font-poppins text-white">{t('premium.choosePlan')}</h3>
              
              {isPremium ? (
                <div className="text-center p-6 bg-gray-900 rounded-lg border border-red-600">
                  <h4 className="text-xl font-bold text-red-600 mb-2">{t('premium.alreadyMember')}</h4>
                  <p className="text-gray-300">
                    {brand === 'bride' ? t('premium.bride.alreadyDesc') : t('premium.bro.alreadyDesc')}
                  </p>
                  <Button className="mt-4 bg-red-600 hover:bg-red-700">
                    {t('premium.goToDashboard')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    className={`border rounded-lg p-6 hover:shadow-md transition duration-300 bg-gray-900 ${
                      selectedPlan === "monthly" ? "border-red-600 shadow-md" : "border-gray-700"
                    }`}
                    onClick={() => setSelectedPlan("monthly")}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white">{t('premium.monthly')}</h4>
                        <p className="text-gray-300 text-sm">{t('premium.monthlyDesc')}</p>
                      </div>
                      <div className="bg-red-900 text-white text-xs px-2 py-1 rounded-full font-medium">{t('premium.popular')}</div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">€2.99</span>
                      <span className="text-gray-400">{t('premium.monthlyPerMonth')}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.allBenefits')}</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.cancelAnytime')}</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.discount10')}</span>
                      </li>
                    </ul>
                    <Button 
                      className={`w-full ${selectedPlan === "monthly" ? "bg-red-600" : "bg-gray-600"} text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300`}
                      onClick={handleUpgrade}
                    >
                      {t('premium.chooseMonthly')}
                    </Button>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-6 hover:shadow-md transition duration-300 bg-gray-900 ${
                      selectedPlan === "annual" ? "border-red-600 shadow-md" : "border-gray-700"
                    }`}
                    onClick={() => setSelectedPlan("annual")}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white">{t('premium.annual')}</h4>
                        <p className="text-gray-300 text-sm">{brand === 'bride' ? t('premium.bride.annualDesc') : t('premium.bro.annualDesc')}</p>
                      </div>
                      <div className="bg-red-900 text-white text-xs px-2 py-1 rounded-full font-medium">{t('premium.save33')}</div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">€23.99</span>
                      <span className="text-gray-400">{t('premium.annualPerYear')}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.allBenefits')}</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.freeTshirts')}</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-red-600 mr-2 h-4 w-4" />
                        <span className="text-sm text-gray-300">{t('premium.discount20')}</span>
                      </li>
                    </ul>
                    <Button 
                      className={`w-full ${selectedPlan === "annual" ? "bg-red-600" : "bg-gray-600"} text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300`}
                      onClick={handleUpgrade}
                    >
                      {t('premium.chooseAnnual')}
                    </Button>
                  </div>
                </div>
              )}
              
              {!isPremium && (
                <div className="mt-6 text-center text-sm text-gray-300">
                  <p>{t('premium.notSure')}<a href="#" className="text-red-600 hover:text-red-700">{t('premium.freeTrial')}</a></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
