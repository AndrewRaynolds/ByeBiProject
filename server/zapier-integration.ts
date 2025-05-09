import axios from 'axios';
import { Request, Response } from 'express';
import type { Express } from 'express';

interface ZapierWebhook {
  id: string;
  url: string;
  event: string;
  active: boolean;
  created: Date;
}

// Archivio in memoria dei webhook attivi
const activeWebhooks: ZapierWebhook[] = [];

// Funzione per registrare i webhook Zapier nel nostro sistema
export const registerZapierWebhook = async (req: Request, res: Response) => {
  try {
    const { url, event } = req.body;
    
    if (!url || !event) {
      return res.status(400).json({ 
        success: false, 
        message: 'Webhook URL and event type are required' 
      });
    }

    // Genera un ID unico per il webhook
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Memorizza il webhook
    const newWebhook: ZapierWebhook = {
      id,
      url,
      event,
      active: true,
      created: new Date()
    };
    
    activeWebhooks.push(newWebhook);
    
    // Verifica il webhook inviando un ping
    try {
      await axios.post(url, {
        event: 'ping',
        message: 'ByeBro webhook successfully registered',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to verify webhook URL:', error);
      // Continuiamo comunque la registrazione anche se la verifica fallisce
    }
    
    return res.status(200).json({
      success: true,
      webhook: newWebhook,
      message: 'Webhook registered successfully'
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to register webhook' 
    });
  }
};

// Funzione per eliminare un webhook
export const deleteZapierWebhook = (req: Request, res: Response) => {
  const { id } = req.params;
  
  const index = activeWebhooks.findIndex(webhook => webhook.id === id);
  
  if (index === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Webhook not found' 
    });
  }
  
  activeWebhooks.splice(index, 1);
  
  return res.status(200).json({
    success: true,
    message: 'Webhook deleted successfully'
  });
};

// Funzione per ottenere i webhook attivi
export const getZapierWebhooks = (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    webhooks: activeWebhooks
  });
};

// Trigger per inviare dati a Zapier quando viene creato un nuovo pacchetto
export const triggerPackageCreated = async (packageData: any) => {
  const relevantWebhooks = activeWebhooks.filter(
    webhook => webhook.active && webhook.event === 'package_created'
  );
  
  const triggerPromises = relevantWebhooks.map(webhook => {
    return axios.post(webhook.url, {
      event: 'package_created',
      data: packageData,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.error(`Failed to trigger webhook ${webhook.id}:`, error);
      // Se il webhook fallisce troppe volte, potremmo disattivarlo
      // webhook.active = false;
    });
  });
  
  await Promise.allSettled(triggerPromises);
};

// Trigger per inviare dati a Zapier quando viene completato un acquisto
export const triggerPurchaseCompleted = async (purchaseData: any) => {
  const relevantWebhooks = activeWebhooks.filter(
    webhook => webhook.active && webhook.event === 'purchase_completed'
  );
  
  const triggerPromises = relevantWebhooks.map(webhook => {
    return axios.post(webhook.url, {
      event: 'purchase_completed',
      data: purchaseData,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.error(`Failed to trigger webhook ${webhook.id}:`, error);
    });
  });
  
  await Promise.allSettled(triggerPromises);
};

// Funzione da chiamare quando un utente richiede un preventivo personalizzato
export const triggerCustomQuoteRequest = async (quoteData: any) => {
  const relevantWebhooks = activeWebhooks.filter(
    webhook => webhook.active && webhook.event === 'quote_requested'
  );
  
  const triggerPromises = relevantWebhooks.map(webhook => {
    return axios.post(webhook.url, {
      event: 'quote_requested',
      data: quoteData,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.error(`Failed to trigger webhook ${webhook.id}:`, error);
    });
  });
  
  await Promise.allSettled(triggerPromises);
};

// Integrazione con le API di Zapier
export function registerZapierRoutes(app: Express) {
  // Registrazione di un nuovo webhook Zapier
  app.post('/api/zapier/webhooks', registerZapierWebhook);
  
  // Eliminazione di un webhook
  app.delete('/api/zapier/webhooks/:id', deleteZapierWebhook);
  
  // Ottenere i webhook attivi
  app.get('/api/zapier/webhooks', getZapierWebhooks);
  
  // Endpoint per ricevere dati da Zapier (per azioni da Zapier a ByeBro)
  app.post('/api/zapier/receive', async (req: Request, res: Response) => {
    try {
      const { action, data } = req.body;
      
      if (!action || !data) {
        return res.status(400).json({ 
          success: false, 
          message: 'Action and data are required' 
        });
      }
      
      // Gestire diverse azioni da Zapier
      switch (action) {
        case 'create_package':
          // Logica per creare un pacchetto da Zapier
          console.log('Creating package from Zapier:', data);
          // Qui implementeremmo la logica per creare un pacchetto nel nostro sistema
          break;
          
        case 'update_pricing':
          // Logica per aggiornare i prezzi
          console.log('Updating pricing from Zapier:', data);
          break;
          
        case 'send_notification':
          // Logica per inviare notifiche
          console.log('Sending notification from Zapier:', data);
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            message: `Unknown action: ${action}` 
          });
      }
      
      return res.status(200).json({
        success: true,
        message: `Action '${action}' processed successfully`
      });
    } catch (error) {
      console.error('Error processing Zapier action:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process Zapier action' 
      });
    }
  });
}

// Esempi di utilizzo per gli eventi Zapier nel nostro assistente
/* 
  // Nel componente dell'assistente, quando viene creato un pacchetto:
  import { triggerPackageCreated } from '@/server/zapier-integration';
  
  // Dopo che l'utente ha finalizzato un pacchetto
  const packageData = {
    id: '12345',
    user: {
      id: user.id,
      email: user.email
    },
    destination: 'Amsterdam',
    startDate: '2025-06-15',
    endDate: '2025-06-18',
    activities: selectedActivities,
    transportation: selectedTransportation,
    accommodation: selectedHotel,
    totalPrice: totalPrice
  };
  
  // Invia l'evento a Zapier
  await triggerPackageCreated(packageData);
  
  // Dopo che è stato completato un acquisto
  const purchaseData = {
    packageId: '12345',
    user: {
      id: user.id, 
      email: user.email
    },
    paymentMethod: 'card',
    amount: totalPrice,
    purchaseDate: new Date().toISOString()
  };
  
  // Invia l'evento a Zapier
  await triggerPurchaseCompleted(purchaseData);
*/