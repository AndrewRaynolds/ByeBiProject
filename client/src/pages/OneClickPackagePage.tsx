import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OneClickAssistant from '@/components/OneClickAssistant';
import { MessageSquare, Package, ShoppingBag, Info } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function OneClickPackagePage() {
  const [activeTab, setActiveTab] = useState<string>('assistant');
  const { t } = useTranslation();
  const isBride = localStorage.getItem('selectedBrand') === 'byebride';
  const brandName = isBride ? 'ByeBride' : 'ByeBro';

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Pannello principale */}
        <div className="w-full md:w-8/12">
          <Card className="mb-6 border-red-600 bg-black text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-white">
                    <span className="text-white">Bye</span><span className={isBride ? "text-pink-600" : "text-red-600"}>{isBride ? 'Bride' : 'Bro'}</span> One Click
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {t(isBride ? 'oneClick.subtitleBride' : 'oneClick.subtitleBro')}
                  </CardDescription>
                </div>
                <div className="hidden md:block">
                  <img 
                    src="https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80" 
                    alt={`${brandName} One Click`}
                    className="h-16 w-16 object-cover rounded-full ring-2 ring-red-600"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="text-white">
                <TabsList className="grid grid-cols-2 mb-8 bg-gray-900">
                  <TabsTrigger value="assistant" className="flex items-center space-x-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    <MessageSquare className="h-4 w-4" />
                    <span>{t('oneClick.assistant', { brand: brandName })}</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex items-center space-x-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    <Package className="h-4 w-4" />
                    <span>{t('oneClick.yourPackages')}</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="assistant" className="h-full">
                  <OneClickAssistant />
                </TabsContent>
                
                <TabsContent value="packages">
                  <div className="space-y-6">
                    <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Package className="h-16 w-16 text-red-500" />
                        <h3 className="text-xl font-bold text-white">{t('oneClick.noPackages')}</h3>
                        <p className="text-gray-300">
                          {t('oneClick.noPackagesDesc', { brand: brandName })}
                        </p>
                        <Button 
                          onClick={() => setActiveTab('assistant')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {t('oneClick.createFirst')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Pannello laterale */}
        <div className="w-full md:w-4/12 space-y-6">
          <Card className="border-red-600 bg-black text-white">
            <CardHeader>
              <CardTitle className="text-xl text-white">{t('oneClick.howItWorks')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <MessageSquare className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t('oneClick.step1Title')}</h4>
                    <p className="text-sm text-gray-300">
                      {t(isBride ? 'oneClick.step1DescBride' : 'oneClick.step1DescBro')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <Package className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t('oneClick.step2Title')}</h4>
                    <p className="text-sm text-gray-300">
                      {t('oneClick.step2Desc')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <ShoppingBag className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t('oneClick.step3Title')}</h4>
                    <p className="text-sm text-gray-300">
                      {t('oneClick.step3Desc')}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4 bg-red-800" />
              
              <div className="rounded-lg bg-red-900 p-4 flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{t('oneClick.note')}</h4>
                  <p className="text-sm text-gray-300">
                    {t('oneClick.noteDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-600 bg-black text-white">
            <CardHeader>
              <CardTitle className="text-xl text-white">{t('destinations.popularTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  {t('destinations.city.amsterdam.name')}, {t('destinations.country.netherlands')}
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  {t('destinations.city.berlin.name')}, {t('destinations.country.germany')}
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  {t('destinations.city.prague.name')}, {t('destinations.country.czechRepublic')}
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  {t('destinations.city.budapest.name')}, {t('destinations.country.hungary')}
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  {t('destinations.city.barcelona.name')}, {t('destinations.country.spain')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
