import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OneClickAssistant from '@/components/OneClickAssistant';
import { MessageSquare, Package, ShoppingBag, Info } from 'lucide-react';
import assistantImage from '@assets/generated_images/Professional_female_digital_assistant_bc9c1e47.png';

export default function OneClickPackagePage() {
  const [activeTab, setActiveTab] = useState<string>('assistant');

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
                    <span className="text-white">Bye</span><span className="text-red-600">Bro</span> One Click
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Crea e acquista il pacchetto addio al celibato perfetto con un solo clic
                  </CardDescription>
                </div>
                <div className="hidden md:block">
                  <img 
                    src={assistantImage} 
                    alt="Assistente ByeBro" 
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
                    <span>Assistente ByeBro</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex items-center space-x-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    <Package className="h-4 w-4" />
                    <span>I tuoi pacchetti</span>
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
                        <h3 className="text-xl font-bold text-white">Nessun pacchetto acquistato</h3>
                        <p className="text-gray-300">
                          Non hai ancora acquistato nessun pacchetto ByeBro. Usa l'assistente per creare il tuo primo pacchetto!
                        </p>
                        <Button 
                          onClick={() => setActiveTab('assistant')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Crea il tuo primo pacchetto
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
              <CardTitle className="text-xl text-white">Come funziona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <MessageSquare className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">1. Parla con l'assistente</h4>
                    <p className="text-sm text-gray-300">
                      Descrivi la tua destinazione ideale, le date e le preferenze per l'addio al celibato.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <Package className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">2. Personalizza il pacchetto</h4>
                    <p className="text-sm text-gray-300">
                      Ricevi un pacchetto personalizzato con voli, hotel, ristoranti e attività. Seleziona le opzioni che preferisci.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-900 rounded-full p-2">
                    <ShoppingBag className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">3. Acquista con un clic</h4>
                    <p className="text-sm text-gray-300">
                      Completa l'acquisto dell'intero pacchetto con un solo clic. Niente più prenotazioni multiple!
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
                  <h4 className="font-bold text-white">Nota</h4>
                  <p className="text-sm text-gray-300">
                    Tutti i pacchetti includono una garanzia di rimborso di 24 ore e assistenza dedicata durante tutto il viaggio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-600 bg-black text-white">
            <CardHeader>
              <CardTitle className="text-xl text-white">Destinazioni popolari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-600 text-white hover:bg-red-900 hover:text-white hover:border-red-500"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Amsterdam, Paesi Bassi
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-600 text-white hover:bg-red-900 hover:text-white hover:border-red-500"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Berlino, Germania
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-600 text-white hover:bg-red-900 hover:text-white hover:border-red-500"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Praga, Repubblica Ceca
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-600 text-white hover:bg-red-900 hover:text-white hover:border-red-500"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Budapest, Ungheria
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-600 text-white hover:bg-red-900 hover:text-white hover:border-red-500"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Barcellona, Spagna
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}