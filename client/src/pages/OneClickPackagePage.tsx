import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OneClickAssistant from '@/components/OneClickAssistant';
import { MessageSquare, Package, ShoppingBag, Info } from 'lucide-react';

export default function OneClickPackagePage() {
  const [activeTab, setActiveTab] = useState<string>('assistant');

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Pannello principale */}
        <div className="w-full md:w-8/12">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold">ByeBro One Click</CardTitle>
                  <CardDescription>
                    Crea e acquista il pacchetto addio al celibato perfetto con un solo clic
                  </CardDescription>
                </div>
                <div className="hidden md:block">
                  <img 
                    src="https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80" 
                    alt="ByeBro One Click" 
                    className="h-16 w-16 object-cover rounded-full ring-2 ring-red-600"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-8">
                  <TabsTrigger value="assistant" className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Assistente ByeBro</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>I tuoi pacchetti</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="assistant" className="h-full">
                  <OneClickAssistant />
                </TabsContent>
                
                <TabsContent value="packages">
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Package className="h-16 w-16 text-gray-400" />
                        <h3 className="text-xl font-bold">Nessun pacchetto acquistato</h3>
                        <p className="text-gray-500">
                          Non hai ancora acquistato nessun pacchetto ByeBro. Usa l'assistente per creare il tuo primo pacchetto!
                        </p>
                        <Button 
                          onClick={() => setActiveTab('assistant')}
                          className="bg-red-600 hover:bg-red-700"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Come funziona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                    <MessageSquare className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">1. Parla con l'assistente</h4>
                    <p className="text-sm text-gray-500">
                      Descrivi la tua destinazione ideale, le date e le preferenze per l'addio al celibato.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                    <Package className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">2. Personalizza il pacchetto</h4>
                    <p className="text-sm text-gray-500">
                      Ricevi un pacchetto personalizzato con voli, hotel, ristoranti e attività. Seleziona le opzioni che preferisci.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                    <ShoppingBag className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">3. Acquista con un clic</h4>
                    <p className="text-sm text-gray-500">
                      Completa l'acquisto dell'intero pacchetto con un solo clic. Niente più prenotazioni multiple!
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="rounded-lg bg-amber-50 p-4 flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-700">Nota</h4>
                  <p className="text-sm text-amber-700">
                    Tutti i pacchetti includono una garanzia di rimborso di 24 ore e assistenza dedicata durante tutto il viaggio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Destinazioni popolari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Amsterdam, Paesi Bassi
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Berlino, Germania
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Praga, Repubblica Ceca
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  onClick={() => {
                    setActiveTab('assistant');
                  }}
                >
                  Budapest, Ungheria
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
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