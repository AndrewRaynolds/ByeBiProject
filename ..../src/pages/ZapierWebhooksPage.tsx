import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash, Plus, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';

interface Webhook {
  id: string;
  url: string;
  event: string;
  active: boolean;
  created: Date;
}

export default function ZapierWebhooksPage() {
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('package_created');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch webhooks
  const { 
    data: webhooks = [], 
    isLoading,
    error 
  } = useQuery<Webhook[]>({
    queryKey: ['/api/zapier/webhooks'],
    staleTime: 30000,
  });
  
  // Add webhook mutation
  const addWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/zapier/webhooks', {
        url: newWebhookUrl,
        event: newWebhookEvent
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zapier/webhooks'] });
      setNewWebhookUrl('');
      toast({
        title: 'Webhook aggiunto',
        description: 'Il webhook Zapier è stato aggiunto con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile aggiungere il webhook Zapier',
        variant: 'destructive',
      });
    }
  });
  
  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/zapier/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zapier/webhooks'] });
      toast({
        title: 'Webhook eliminato',
        description: 'Il webhook Zapier è stato eliminato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile eliminare il webhook Zapier',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) {
      toast({
        title: 'URL mancante',
        description: 'Inserisci l\'URL del webhook Zapier',
        variant: 'destructive',
      });
      return;
    }
    addWebhookMutation.mutate();
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Integrazione Zapier</h1>
          <p className="text-gray-500">Gestisci i webhook per l'integrazione con Zapier</p>
        </div>
        <Link href="/">
          <Button variant="outline">Torna alla Home</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Nuovo Webhook</CardTitle>
              <CardDescription>
                Aggiungi un nuovo webhook Zapier per automatizzare le operazioni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL del Webhook Zapier</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://hooks.zapier.com/..."
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webhook-event">Evento</Label>
                  <Select
                    value={newWebhookEvent}
                    onValueChange={setNewWebhookEvent}
                  >
                    <SelectTrigger id="webhook-event">
                      <SelectValue placeholder="Seleziona un evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="package_created">Creazione Pacchetto</SelectItem>
                      <SelectItem value="purchase_completed">Acquisto Completato</SelectItem>
                      <SelectItem value="quote_requested">Richiesta Preventivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleSubmit}
                disabled={addWebhookMutation.isPending}
              >
                {addWebhookMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aggiunta in corso...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Webhook
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>Cos'è Zapier?</strong> Zapier è una piattaforma di automazione che collega le tue app e servizi preferiti, permettendoti di automatizzare attività ripetitive senza scrivere codice.
              </p>
              <p>
                <strong>Come funziona?</strong> ByeBro invia dati a Zapier quando si verificano determinati eventi. Zapier può quindi eseguire azioni automatiche in base a questi eventi.
              </p>
              <p>
                <strong>Esempi di automazione:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Invia email di conferma quando viene completato un acquisto</li>
                <li>Aggiungi eventi al calendario quando viene creato un pacchetto</li>
                <li>Salva i dati dei clienti in un CRM</li>
                <li>Crea promemoria in Slack</li>
              </ul>
              
              <a 
                href="https://zapier.com/apps/webhooks/integrations" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Scopri di più su Zapier
              </a>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Attivi</CardTitle>
              <CardDescription>
                Gestisci i webhook configurati per l'integrazione con Zapier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  Si è verificato un errore nel caricamento dei webhook
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Non ci sono webhook configurati</p>
                  <p className="mt-2 text-sm">Aggiungi un nuovo webhook per iniziare a utilizzare l'integrazione con Zapier</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div 
                      key={webhook.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`w-2 h-2 rounded-full ${webhook.active ? 'bg-green-500' : 'bg-gray-400'}`}
                          />
                          <h3 className="font-semibold">
                            {webhook.event === 'package_created' && 'Creazione Pacchetto'}
                            {webhook.event === 'purchase_completed' && 'Acquisto Completato'}
                            {webhook.event === 'quote_requested' && 'Richiesta Preventivo'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-md">
                          {webhook.url}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Creato il: {new Date(webhook.created).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                        disabled={deleteWebhookMutation.isPending}
                      >
                        {deleteWebhookMutation.variables === webhook.id && deleteWebhookMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Eventi Disponibili</CardTitle>
              <CardDescription>
                Questi sono gli eventi che possono attivare un webhook Zapier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Creazione Pacchetto (package_created)</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Inviato quando un utente crea un nuovo pacchetto personalizzato.
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                    {`{
  "event": "package_created",
  "data": {
    "packageId": "12345",
    "userId": "user_123",
    "destination": "Amsterdam",
    "startDate": "2025-06-15",
    "endDate": "2025-06-18",
    "items": [...],
    "totalPrice": 349.95
  },
  "timestamp": "2025-05-09T12:34:56.789Z"
}`}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Acquisto Completato (purchase_completed)</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Inviato quando un utente completa l'acquisto di un pacchetto.
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                    {`{
  "event": "purchase_completed",
  "data": {
    "packageId": "12345",
    "userId": "user_123",
    "userEmail": "user@example.com",
    "items": [...],
    "totalPrice": 349.95,
    "purchaseDate": "2025-05-09T12:34:56.789Z"
  },
  "timestamp": "2025-05-09T12:34:56.789Z"
}`}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Richiesta Preventivo (quote_requested)</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Inviato quando un utente richiede un preventivo personalizzato.
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                    {`{
  "event": "quote_requested",
  "data": {
    "userId": "user_123",
    "userEmail": "user@example.com",
    "destination": "Amsterdam",
    "startDate": "2025-06-15",
    "endDate": "2025-06-18",
    "groupSize": 6,
    "budget": "standard",
    "preferences": [...]
  },
  "timestamp": "2025-05-09T12:34:56.789Z"
}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}