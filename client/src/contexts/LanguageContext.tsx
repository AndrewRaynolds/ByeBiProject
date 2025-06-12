import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'it' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Traduzioni complete per tutte le lingue
const translations = {
  en: {
    // Header
    'header.login': 'Log In',
    'header.dashboard': 'Dashboard',
    'header.logout': 'Logout',
    
    // Navigation
    'nav.home': 'Home',
    'nav.destinations': 'Destinations', 
    'nav.experiences': 'Experiences',
    'nav.merchandise': 'Merchandise',
    'nav.blog': 'Secret Blog',
    'nav.splitta': 'SplittaBro',
    'nav.oneclick': 'One-Click Package',
    
    // Hero Section
    'hero.title': 'The Ultimate Bachelor Party Experience',
    'hero.subtitle': 'Create unforgettable memories with your bros. From epic destinations to legendary nights out.',
    'hero.cta': 'Plan Your Adventure',
    'hero.secondary': 'Explore Destinations',
    
    // How It Works
    'howitworks.title': 'How It Works',
    'howitworks.step1.title': 'Choose Your Destination',
    'howitworks.step1.desc': 'Select from our curated list of epic bachelor party destinations across Europe.',
    'howitworks.step2.title': 'Pick Your Experience',
    'howitworks.step2.desc': 'From wild nightlife to adventure sports, customize your perfect weekend.',
    'howitworks.step3.title': 'Book & Party',
    'howitworks.step3.desc': 'We handle all the details. You just show up and create memories.',
    
    // Featured Destinations
    'destinations.title': 'Epic Destinations',
    'destinations.subtitle': 'Legendary cities that know how to party',
    'destinations.viewall': 'View All Destinations',
    'destinations.from': 'from',
    'destinations.night': 'night',
    
    // Experience Types
    'experiences.title': 'Choose Your Vibe',
    'experiences.nightlife': 'Epic Nightlife',
    'experiences.nightlife.desc': 'VIP club access, bar crawls, and legendary nights',
    'experiences.adventure': 'Adrenaline Rush',
    'experiences.adventure.desc': 'Extreme sports, outdoor adventures, and thrills',
    'experiences.culture': 'Cultural Immersion',
    'experiences.culture.desc': 'Local experiences, history, and authentic culture',
    'experiences.food': 'Culinary Adventures',
    'experiences.food.desc': 'Food tours, breweries, and gastronomic experiences',
    
    // Premium Features
    'premium.title': 'Premium BroBenefits',
    'premium.subtitle': 'Upgrade your experience with exclusive perks',
    'premium.concierge': 'Personal Concierge',
    'premium.concierge.desc': '24/7 support for all your needs',
    'premium.vip': 'VIP Access',
    'premium.vip.desc': 'Skip lines and get the best tables',
    'premium.custom': 'Custom Itineraries',
    'premium.custom.desc': 'Tailored experiences just for your group',
    'premium.upgrade': 'Upgrade to Premium',
    
    // One-Click Assistant
    'oneclick.title': 'AI Travel Assistant',
    'oneclick.subtitle': 'Let our AI plan the perfect bachelor party weekend',
    'oneclick.destination': 'Where do you want to party?',
    'oneclick.dates': 'Party Dates',
    'oneclick.startdate': 'Start Date',
    'oneclick.enddate': 'End Date',
    'oneclick.group': 'Group Details',
    'oneclick.adults': 'Number of Adults',
    'oneclick.budget': 'Budget Level',
    'oneclick.budget.budget': 'Budget',
    'oneclick.budget.standard': 'Standard',
    'oneclick.budget.luxury': 'Luxury',
    'oneclick.activities': 'What are you into?',
    'oneclick.activities.nightlife': 'Nightlife',
    'oneclick.activities.food': 'Food & Drinks',
    'oneclick.activities.culture': 'Culture',
    'oneclick.activities.adventure': 'Adventure',
    'oneclick.activities.relaxation': 'Relaxation',
    'oneclick.generate': 'Generate Package',
    'oneclick.generating': 'Creating your epic weekend...',
    
    // Package Results
    'package.flights': 'Flights',
    'package.hotels': 'Hotels',
    'package.activities': 'Activities',
    'package.totalcost': 'Total Cost',
    'package.book': 'Book This Package',
    'package.customize': 'Customize',
    'package.rating': 'Rating',
    'package.duration': 'Duration',
    'package.price': 'Price',
    
    // SplittaBro
    'splitta.title': 'SplittaBro',
    'splitta.subtitle': 'Split expenses like a boss',
    'splitta.create': 'Create New Group',
    'splitta.groupname': 'Group Name',
    'splitta.members': 'Members',
    'splitta.addexpense': 'Add Expense',
    'splitta.description': 'Description',
    'splitta.amount': 'Amount',
    'splitta.currency': 'Currency',
    'splitta.paidby': 'Paid by',
    'splitta.save': 'Save Expense',
    'splitta.total': 'Total',
    'splitta.youowe': 'You owe',
    'splitta.owesyou': 'owes you',
    
    // Forms
    'form.submit': 'Submit',
    'form.cancel': 'Cancel',
    'form.save': 'Save',
    'form.delete': 'Delete',
    'form.edit': 'Edit',
    'form.required': 'Required field',
    'form.email': 'Email',
    'form.password': 'Password',
    'form.name': 'Name',
    'form.phone': 'Phone',
    
    // Messages
    'msg.success': 'Success!',
    'msg.error': 'Error occurred',
    'msg.loading': 'Loading...',
    'msg.notfound': 'Not found',
    'msg.unauthorized': 'Unauthorized access',
    'msg.comingsoon': 'Coming soon',
    
    // Footer
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.rights': 'All rights reserved',
  },
  
  it: {
    // Header
    'header.login': 'Accedi',
    'header.dashboard': 'Dashboard',
    'header.logout': 'Esci',
    
    // Navigation
    'nav.home': 'Home',
    'nav.destinations': 'Destinazioni',
    'nav.experiences': 'Esperienze',
    'nav.merchandise': 'Merchandise',
    'nav.blog': 'Blog Segreto',
    'nav.splitta': 'SplittaBro',
    'nav.oneclick': 'Pacchetto One-Click',
    
    // Hero Section
    'hero.title': 'L\'Esperienza Ultimate per Addii al Celibato',
    'hero.subtitle': 'Crea ricordi indimenticabili con i tuoi amici. Da destinazioni epiche a notti leggendarie.',
    'hero.cta': 'Pianifica la Tua Avventura',
    'hero.secondary': 'Esplora Destinazioni',
    
    // How It Works
    'howitworks.title': 'Come Funziona',
    'howitworks.step1.title': 'Scegli la Destinazione',
    'howitworks.step1.desc': 'Seleziona dalla nostra lista curata di destinazioni epiche per addii al celibato in Europa.',
    'howitworks.step2.title': 'Scegli l\'Esperienza',
    'howitworks.step2.desc': 'Dalla vita notturna selvaggia agli sport estremi, personalizza il tuo weekend perfetto.',
    'howitworks.step3.title': 'Prenota & Festeggia',
    'howitworks.step3.desc': 'Gestiamo tutti i dettagli. Tu devi solo presentarti e creare ricordi.',
    
    // Featured Destinations
    'destinations.title': 'Destinazioni Epiche',
    'destinations.subtitle': 'Città leggendarie che sanno come festeggiare',
    'destinations.viewall': 'Vedi Tutte le Destinazioni',
    'destinations.from': 'da',
    'destinations.night': 'notte',
    
    // Experience Types
    'experiences.title': 'Scegli il Tuo Stile',
    'experiences.nightlife': 'Vita Notturna Epica',
    'experiences.nightlife.desc': 'Accesso VIP ai club, tour dei bar e notti leggendarie',
    'experiences.adventure': 'Scarica di Adrenalina',
    'experiences.adventure.desc': 'Sport estremi, avventure all\'aperto ed emozioni',
    'experiences.culture': 'Immersione Culturale',
    'experiences.culture.desc': 'Esperienze locali, storia e cultura autentica',
    'experiences.food': 'Avventure Culinarie',
    'experiences.food.desc': 'Tour gastronomici, birrifici ed esperienze enogastronomiche',
    
    // Premium Features
    'premium.title': 'BroBenefits Premium',
    'premium.subtitle': 'Aggiorna la tua esperienza con vantaggi esclusivi',
    'premium.concierge': 'Concierge Personale',
    'premium.concierge.desc': 'Supporto 24/7 per tutte le tue esigenze',
    'premium.vip': 'Accesso VIP',
    'premium.vip.desc': 'Salta le code e ottieni i migliori tavoli',
    'premium.custom': 'Itinerari Personalizzati',
    'premium.custom.desc': 'Esperienze su misura solo per il tuo gruppo',
    'premium.upgrade': 'Aggiorna a Premium',
    
    // One-Click Assistant
    'oneclick.title': 'Assistente Viaggio AI',
    'oneclick.subtitle': 'Lascia che la nostra AI pianifichi il weekend perfetto per l\'addio al celibato',
    'oneclick.destination': 'Dove vuoi festeggiare?',
    'oneclick.dates': 'Date della Festa',
    'oneclick.startdate': 'Data Inizio',
    'oneclick.enddate': 'Data Fine',
    'oneclick.group': 'Dettagli Gruppo',
    'oneclick.adults': 'Numero di Adulti',
    'oneclick.budget': 'Livello Budget',
    'oneclick.budget.budget': 'Economico',
    'oneclick.budget.standard': 'Standard',
    'oneclick.budget.luxury': 'Lusso',
    'oneclick.activities': 'Cosa ti interessa?',
    'oneclick.activities.nightlife': 'Vita Notturna',
    'oneclick.activities.food': 'Cibo e Bevande',
    'oneclick.activities.culture': 'Cultura',
    'oneclick.activities.adventure': 'Avventura',
    'oneclick.activities.relaxation': 'Relax',
    'oneclick.generate': 'Genera Pacchetto',
    'oneclick.generating': 'Creando il tuo weekend epico...',
    
    // Package Results
    'package.flights': 'Voli',
    'package.hotels': 'Hotel',
    'package.activities': 'Attività',
    'package.totalcost': 'Costo Totale',
    'package.book': 'Prenota Questo Pacchetto',
    'package.customize': 'Personalizza',
    'package.rating': 'Valutazione',
    'package.duration': 'Durata',
    'package.price': 'Prezzo',
    
    // SplittaBro
    'splitta.title': 'SplittaBro',
    'splitta.subtitle': 'Dividi le spese come un boss',
    'splitta.create': 'Crea Nuovo Gruppo',
    'splitta.groupname': 'Nome Gruppo',
    'splitta.members': 'Membri',
    'splitta.addexpense': 'Aggiungi Spesa',
    'splitta.description': 'Descrizione',
    'splitta.amount': 'Importo',
    'splitta.currency': 'Valuta',
    'splitta.paidby': 'Pagato da',
    'splitta.save': 'Salva Spesa',
    'splitta.total': 'Totale',
    'splitta.youowe': 'Devi',
    'splitta.owesyou': 'ti deve',
    
    // Forms
    'form.submit': 'Invia',
    'form.cancel': 'Annulla',
    'form.save': 'Salva',
    'form.delete': 'Elimina',
    'form.edit': 'Modifica',
    'form.required': 'Campo obbligatorio',
    'form.email': 'Email',
    'form.password': 'Password',
    'form.name': 'Nome',
    'form.phone': 'Telefono',
    
    // Messages
    'msg.success': 'Successo!',
    'msg.error': 'Si è verificato un errore',
    'msg.loading': 'Caricamento...',
    'msg.notfound': 'Non trovato',
    'msg.unauthorized': 'Accesso non autorizzato',
    'msg.comingsoon': 'Prossimamente',
    
    // Footer
    'footer.about': 'Chi Siamo',
    'footer.contact': 'Contatti',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Termini di Servizio',
    'footer.rights': 'Tutti i diritti riservati',
  },
  
  es: {
    // Header
    'header.login': 'Iniciar Sesión',
    'header.dashboard': 'Panel',
    'header.logout': 'Cerrar Sesión',
    
    // Navigation
    'nav.home': 'Inicio',
    'nav.destinations': 'Destinos',
    'nav.experiences': 'Experiencias',
    'nav.merchandise': 'Merchandising',
    'nav.blog': 'Blog Secreto',
    'nav.splitta': 'SplittaBro',
    'nav.oneclick': 'Paquete One-Click',
    
    // Hero Section
    'hero.title': 'La Experiencia Ultimate de Despedida de Soltero',
    'hero.subtitle': 'Crea recuerdos inolvidables con tus hermanos. Desde destinos épicos hasta noches legendarias.',
    'hero.cta': 'Planifica Tu Aventura',
    'hero.secondary': 'Explorar Destinos',
    
    // How It Works
    'howitworks.title': 'Cómo Funciona',
    'howitworks.step1.title': 'Elige Tu Destino',
    'howitworks.step1.desc': 'Selecciona de nuestra lista curada de destinos épicos para despedidas de soltero en Europa.',
    'howitworks.step2.title': 'Elige Tu Experiencia',
    'howitworks.step2.desc': 'Desde vida nocturna salvaje hasta deportes extremos, personaliza tu fin de semana perfecto.',
    'howitworks.step3.title': 'Reserva y Celebra',
    'howitworks.step3.desc': 'Manejamos todos los detalles. Solo tienes que aparecer y crear recuerdos.',
    
    // Featured Destinations
    'destinations.title': 'Destinos Épicos',
    'destinations.subtitle': 'Ciudades legendarias que saben cómo celebrar',
    'destinations.viewall': 'Ver Todos los Destinos',
    'destinations.from': 'desde',
    'destinations.night': 'noche',
    
    // Experience Types
    'experiences.title': 'Elige Tu Ambiente',
    'experiences.nightlife': 'Vida Nocturna Épica',
    'experiences.nightlife.desc': 'Acceso VIP a clubes, tours de bares y noches legendarias',
    'experiences.adventure': 'Subidón de Adrenalina',
    'experiences.adventure.desc': 'Deportes extremos, aventuras al aire libre y emociones',
    'experiences.culture': 'Inmersión Cultural',
    'experiences.culture.desc': 'Experiencias locales, historia y cultura auténtica',
    'experiences.food': 'Aventuras Culinarias',
    'experiences.food.desc': 'Tours gastronómicos, cervecerías y experiencias enogastronómicas',
    
    // Premium Features
    'premium.title': 'BroBeneficios Premium',
    'premium.subtitle': 'Mejora tu experiencia con ventajas exclusivas',
    'premium.concierge': 'Conserje Personal',
    'premium.concierge.desc': 'Soporte 24/7 para todas tus necesidades',
    'premium.vip': 'Acceso VIP',
    'premium.vip.desc': 'Salta las colas y consigue las mejores mesas',
    'premium.custom': 'Itinerarios Personalizados',
    'premium.custom.desc': 'Experiencias a medida solo para tu grupo',
    'premium.upgrade': 'Actualizar a Premium',
    
    // One-Click Assistant
    'oneclick.title': 'Asistente de Viaje AI',
    'oneclick.subtitle': 'Deja que nuestra AI planifique el fin de semana perfecto de despedida de soltero',
    'oneclick.destination': '¿Dónde quieres celebrar?',
    'oneclick.dates': 'Fechas de la Fiesta',
    'oneclick.startdate': 'Fecha de Inicio',
    'oneclick.enddate': 'Fecha de Fin',
    'oneclick.group': 'Detalles del Grupo',
    'oneclick.adults': 'Número de Adultos',
    'oneclick.budget': 'Nivel de Presupuesto',
    'oneclick.budget.budget': 'Económico',
    'oneclick.budget.standard': 'Estándar',
    'oneclick.budget.luxury': 'Lujo',
    'oneclick.activities': '¿Qué te interesa?',
    'oneclick.activities.nightlife': 'Vida Nocturna',
    'oneclick.activities.food': 'Comida y Bebidas',
    'oneclick.activities.culture': 'Cultura',
    'oneclick.activities.adventure': 'Aventura',
    'oneclick.activities.relaxation': 'Relajación',
    'oneclick.generate': 'Generar Paquete',
    'oneclick.generating': 'Creando tu fin de semana épico...',
    
    // Package Results
    'package.flights': 'Vuelos',
    'package.hotels': 'Hoteles',
    'package.activities': 'Actividades',
    'package.totalcost': 'Costo Total',
    'package.book': 'Reservar Este Paquete',
    'package.customize': 'Personalizar',
    'package.rating': 'Valoración',
    'package.duration': 'Duración',
    'package.price': 'Precio',
    
    // SplittaBro
    'splitta.title': 'SplittaBro',
    'splitta.subtitle': 'Divide gastos como un jefe',
    'splitta.create': 'Crear Nuevo Grupo',
    'splitta.groupname': 'Nombre del Grupo',
    'splitta.members': 'Miembros',
    'splitta.addexpense': 'Añadir Gasto',
    'splitta.description': 'Descripción',
    'splitta.amount': 'Cantidad',
    'splitta.currency': 'Moneda',
    'splitta.paidby': 'Pagado por',
    'splitta.save': 'Guardar Gasto',
    'splitta.total': 'Total',
    'splitta.youowe': 'Debes',
    'splitta.owesyou': 'te debe',
    
    // Forms
    'form.submit': 'Enviar',
    'form.cancel': 'Cancelar',
    'form.save': 'Guardar',
    'form.delete': 'Eliminar',
    'form.edit': 'Editar',
    'form.required': 'Campo requerido',
    'form.email': 'Email',
    'form.password': 'Contraseña',
    'form.name': 'Nombre',
    'form.phone': 'Teléfono',
    
    // Messages
    'msg.success': '¡Éxito!',
    'msg.error': 'Ocurrió un error',
    'msg.loading': 'Cargando...',
    'msg.notfound': 'No encontrado',
    'msg.unauthorized': 'Acceso no autorizado',
    'msg.comingsoon': 'Próximamente',
    
    // Footer
    'footer.about': 'Acerca de',
    'footer.contact': 'Contacto',
    'footer.privacy': 'Política de Privacidad',
    'footer.terms': 'Términos de Servicio',
    'footer.rights': 'Todos los derechos reservados',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}