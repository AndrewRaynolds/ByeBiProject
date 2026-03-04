import { createClient } from '@supabase/supabase-js';

// 1. Recuperiamo le chiavi dai Secrets di Replit.
// (Nota: Vite usa "import.meta.env" invece di "process.env")
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Controllo di sicurezza: se mancano le chiavi, ci avvisa nella console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Attenzione: Variabili d'ambiente VITE_SUPABASE mancanti!");
}

// 3. Creiamo la connessione ufficiale e la esportiamo ("export")
// così potrai usarla in qualsiasi altro file del tuo frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);