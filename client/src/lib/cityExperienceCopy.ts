type ExperienceLocale = "it" | "en" | "es";

interface LocalizedExperienceCopy {
  en: { name?: string; description: string };
  es: { name?: string; description: string };
}

// Venue names remain canonical; only generic activity names are localized.
const LOCALIZED_EXPERIENCE_COPY: Record<string, LocalizedExperienceCopy> = {
  "rome.restaurants.Roscioli": {
    en: { description: "Historic deli and restaurant serving refined Roman cuisine" },
    es: { description: "Salumería y restaurante histórico de refinada cocina romana" },
  },
  "rome.restaurants.Da Enzo al 29": {
    en: { description: "Authentic trattoria in the heart of Trastevere" },
    es: { description: "Trattoria auténtica en el corazón de Trastevere" },
  },
  "rome.restaurants.Armando al Pantheon": {
    en: { description: "Classical Roman cuisine next to the Pantheon" },
    es: { description: "Cocina clásica romana junto al Panteón" },
  },
  "rome.restaurants.Pizzarium": {
    en: { description: "Bonci gourmet cut pizza" },
    es: { description: "Pizza de corte gourmet Bonci" },
  },
  "rome.restaurants.Pierluigi": {
    en: { description: "Fish and lively atmosphere in Piazza de' Ricci" },
    es: { description: "Pescado y ambiente animado en Piazza de' Ricci" },
  },
  "rome.restaurants.Felice a Testaccio": {
    en: { description: "Temple of cacio and pepper and Roman classics" },
    es: { description: "Templo de cacio y pimienta y clásicos romanos" },
  },
  "rome.restaurants.Trapizzino": {
    en: { description: "Roman street food: stuffed pizza pockets" },
    es: { description: "Comida callejera romana: triángulos de pizza rellenos" },
  },
  "rome.restaurants.Glass Hostaria": {
    en: { description: "Stella Michelin in Trastevere, creative cuisine" },
    es: { description: "Stella Michelin en Trastevere, cocina creativa" },
  },
  "rome.restaurants.Trattoria Da Cesare al Casaletto": {
    en: { description: "Roman cuisine outside the tourist circuits" },
    es: { description: "Cocina romana fuera de los circuitos turísticos" },
  },
  "rome.restaurants.Salumeria Roscioli": {
    en: { description: "Carbonara and Amatriciana by manual" },
    es: { description: "Carbonara y Amatriciana por manual" },
  },
  "rome.bars.Drink Kong": {
    en: { description: "Cocktail bar award-winning cyberpunk style" },
    es: { description: "Cocktail bar galardonado estilo ciberpunk" },
  },
  "rome.bars.Freni e Frizioni": {
    en: { description: "Cocktail bar and iconic aperitif in Trastevere" },
    es: { description: "Barra de cócteles y aperitivo icónico en Trastevere" },
  },
  "rome.bars.The Jerry Thomas Speakeasy": {
    en: { description: "Historical Speakeasy, password access" },
    es: { description: "Históricamente hablado, acceso a contraseña" },
  },
  "rome.bars.Stravinskij Bar": {
    en: { description: "Elegant cocktail in the garden of Hotel de Russie" },
    es: { description: "Cócteles elegantes en el jardín del Hotel de Russie" },
  },
  "rome.bars.Salotto 42": {
    en: { description: "Design lounge bar in front of the Temple of Adriano" },
    es: { description: "Bar de salón de diseño delante del Templo de Adriano" },
  },
  "rome.bars.Argot": {
    en: { description: "Cocktail bar intimate in the Old Town" },
    es: { description: "Cocktail bar íntimo en el casco antiguo" },
  },
  "rome.bars.Officina Beat": {
    en: { description: "Search cocktail bar in Trastevere" },
    es: { description: "Buscar bar en Trastevere" },
  },
  "rome.bars.Co.So": {
    en: { description: "Cocktail bar pop in Pigneto" },
    es: { description: "Cocktail bar pop en Pigneto" },
  },
  "rome.bars.Spirito": {
    en: { description: "Speakeasy hidden behind a bakery" },
    es: { description: "Hablando escondido detrás de una panadería" },
  },
  "rome.bars.Hey Güey": {
    en: { description: "Mezcal and Mexican cocktails" },
    es: { description: "Cocteles mezcales y mexicanos" },
  },
  "rome.nightlife.Goa Club": {
    en: { description: "Roman techno temple since 1999" },
    es: { description: "Templo de techno romano desde 1999" },
  },
  "rome.nightlife.Shari Vari Playhouse": {
    en: { description: "Central disco, mix of musical genres" },
    es: { description: "discoteca central, mezcla de géneros musicales" },
  },
  "rome.nightlife.Lanificio 159": {
    en: { description: "Multifunctional space with DJ international sets" },
    es: { description: "Espacio multifuncional con conjuntos internacionales DJ" },
  },
  "rome.nightlife.Akab Club": {
    en: { description: "Historical Club in Testaccio" },
    es: { description: "Club histórico en Testaccio" },
  },
  "rome.nightlife.Spazio 900": {
    en: { description: "Disco club for under 30, hip-hop and commercial" },
    es: { description: "Disco club para menos de 30, hip-hop y comercial" },
  },
  "rome.nightlife.Room 26": {
    en: { description: "Disco at EUR, large format" },
    es: { description: "Disco a EUR, gran formato" },
  },
  "rome.nightlife.Piper Club": {
    en: { description: "Legendary local opened since 1965" },
    es: { description: "Lugar legendario abierto desde 1965" },
  },
  "rome.nightlife.La Maison": {
    en: { description: "Exclusive Club in the Old Town" },
    es: { description: "Club Exclusivo en el casco antiguo" },
  },
  "rome.nightlife.Art Cafè": {
    en: { description: "Disco in the heart of Villa Borghese" },
    es: { description: "Disco en el corazón de Villa Borghese" },
  },
  "rome.nightlife.Brancaleone": {
    en: { description: "Underground club for house and electronic music" },
    es: { description: "Club underground de house y música electrónica" },
  },
  "rome.activities.Tour del Colosseo e Foro Romano": {
    en: { name: "Colosseum and Roman Forum tour", description: "Skip-the-line guided tour of Rome’s most iconic monuments" },
    es: { name: "Tour del Coliseo y el Foro Romano", description: "Visita guiada sin colas a los monumentos más emblemáticos de Roma" },
  },
  "rome.activities.Vaticano e Cappella Sistina": {
    en: { name: "Vatican and Sistine Chapel", description: "Guided tour of the Vatican Museums" },
    es: { name: "Vaticano y Capilla Sixtina", description: "Visita guiada a los Museos Vaticanos" },
  },
  "rome.activities.Tour gastronomico di Trastevere": {
    en: { name: "Trastevere gastronomic tour", description: "Food, wine and curiosity in the bohémien district" },
    es: { name: "Tour gastronómico por Trastevere", description: "Comida, vino y curiosidades en el barrio bohemio" },
  },
  "rome.activities.Galleria Borghese": {
    en: { name: "Borghese Gallery", description: "Masterpieces by Bernini and Caravaggio" },
    es: { name: "Galería Borghese", description: "Obras maestras de Bernini y Caravaggio" },
  },
  "rome.activities.Castel Sant'Angelo": {
    en: { name: "Castel Sant'Angelo", description: "Visit to the mausoleum with panoramic view" },
    es: { name: "Castel Sant'Angelo", description: "Visita al mausoleo con vista panorámica" },
  },
  "rome.activities.Catacombe di Roma": {
    en: { name: "Catacombs of Rome", description: "Explore the underground of the ancient city" },
    es: { name: "Catacumbas de Roma", description: "Explora los pasadizos subterráneos de la antigua ciudad" },
  },
  "rome.activities.Pantheon: ingresso prioritario": {
    en: { name: "Pantheon: priority entry", description: "The best preserved monument of antiquity" },
    es: { name: "Panteón: entrada prioritaria", description: "El monumento mejor conservado de la antigüedad" },
  },
  "rome.activities.Bus Hop-on Hop-off": {
    en: { name: "Bus Hop-on Hop-off", description: "Panoramic tour around the city" },
    es: { name: "Bus Hop-on Hop-off", description: "Paseo panorámico por la ciudad" },
  },
  "rome.activities.Tour in Vespa": {
    en: { name: "Vespa tour", description: "See Rome from Italy’s most iconic two wheels" },
    es: { name: "Tour en Vespa", description: "Descubre Roma sobre las dos ruedas más icónicas de Italia" },
  },
  "rome.activities.Day trip Pompei e Costiera": {
    en: { name: "Pompeii and Amalfi Coast day trip", description: "A full-day escape from Rome" },
    es: { name: "Excursión a Pompeya y la Costa Amalfitana", description: "Una excursión de día completo desde Roma" },
  },
  "ibiza.restaurants.Sa Capilla": {
    en: { description: "Romantic dinner in a deconsecrated chapel" },
    es: { description: "Cena romántica en una capilla deconsagrada" },
  },
  "ibiza.restaurants.La Brasa": {
    en: { description: "Mediterranean cuisine in the garden, Ibiza Town" },
    es: { description: "Cocina mediterránea en el jardín, Ciudad de Ibiza" },
  },
  "ibiza.restaurants.Es Boldado": {
    en: { description: "Breathtaking view on Es Vedrà, fresh fish" },
    es: { description: "Vista impresionante sobre Es Vedrà, pescado fresco" },
  },
  "ibiza.restaurants.Cana Sofia": {
    en: { description: "Sea history in Cala Vadella" },
    es: { description: "Historia del mar en Cala Vadella" },
  },
  "ibiza.restaurants.Es Xarcu": {
    en: { description: "Beach restaurant with grilled fish" },
    es: { description: "Restaurante de playa con pescado a la plancha" },
  },
  "ibiza.restaurants.Casa Maca": {
    en: { description: "Farm-to-table kitchen with city view" },
    es: { description: "Cocina con vista a la ciudad" },
  },
  "ibiza.restaurants.El Chiringuito": {
    en: { description: "Elegant beach club in Es Cavallet" },
    es: { description: "Elegante club de playa en Es Cavallet" },
  },
  "ibiza.restaurants.Locals Only": {
    en: { description: "Restaurant and bar in the centre square" },
    es: { description: "Restaurante y bar en la plaza central" },
  },
  "ibiza.restaurants.Calma Ibiza": {
    en: { description: "Fish cuisine at Marina Botafoch port" },
    es: { description: "Cocina de pescado en puerto de Marina Botafoch" },
  },
  "ibiza.restaurants.Ses Boques": {
    en: { description: "Fresh fish with bay view" },
    es: { description: "Pescado fresco con vista a la bahía" },
  },
  "ibiza.bars.Lío Ibiza": {
    en: { description: "Cabaret, dinner and DJ set on the port" },
    es: { description: "Cabaret, cena y DJ en el puerto" },
  },
  "ibiza.bars.Sunset Ashram": {
    en: { description: "Legendary sunset in Cala Conta" },
    es: { description: "El atardecer legendario en Cala Conta" },
  },
  "ibiza.bars.Café del Mar": {
    en: { description: "Historic spot for sunset in San Antonio" },
    es: { description: "Lugar histórico para el atardecer en San Antonio" },
  },
  "ibiza.bars.Hostal La Torre": {
    en: { description: "Sunset view and DJ set chill" },
    es: { description: "Sunset vista y DJ set chill" },
  },
  "ibiza.bars.Mambo": {
    en: { description: "Sunset bar in San Antonio with big DJs" },
    es: { description: "Sunset bar en San Antonio con grandes DJs" },
  },
  "ibiza.bars.Kumharas": {
    en: { description: "hippie atmosphere and unique sunsets" },
    es: { description: "ambiente hippie y atardeceres únicos" },
  },
  "ibiza.bars.Atzaró Beach": {
    en: { description: "Elegant beach club in Cala Nova" },
    es: { description: "Elegante club de playa en Cala Nova" },
  },
  "ibiza.bars.Paradise Lost": {
    en: { description: "Cocktail bar in Ibiza Town" },
    es: { description: "Bar de cócteles en Ciudad de Ibiza" },
  },
  "ibiza.bars.El Patio": {
    en: { description: "Cocktails and tapas in Dalt Vila" },
    es: { description: "Cocktails and tapas in Dalt Vila" },
  },
  "ibiza.bars.Beachouse": {
    en: { description: "Beach club with DJ day sets" },
    es: { description: "Beach club con sesiones diurnas de DJ" },
  },
  "ibiza.nightlife.Pacha Ibiza": {
    en: { description: "Legendary club open since 1973" },
    es: { description: "Club legendario abierto desde 1973" },
  },
  "ibiza.nightlife.Ushuaïa": {
    en: { description: "Open-air Club with world top DJs" },
    es: { description: "Open-air Club con mejores DJs del mundo" },
  },
  "ibiza.nightlife.Hï Ibiza": {
    en: { description: "Elected best club in the world several times" },
    es: { description: "Elegido mejor club del mundo varias veces" },
  },
  "ibiza.nightlife.Amnesia": {
    en: { description: "Iconic club with foam parties" },
    es: { description: "Iconic club con fiestas de espuma" },
  },
  "ibiza.nightlife.DC-10": {
    en: { description: "Temple of underground techno" },
    es: { description: "Temple of underground techno" },
  },
  "ibiza.nightlife.Privilege": {
    en: { description: "The world's largest club for capacity" },
    es: { description: "El club más grande del mundo para la capacidad" },
  },
  "ibiza.nightlife.Eden": {
    en: { description: "Clubs in San Antonio with high level resident" },
    es: { description: "Clubes en San Antonio con residencia de alto nivel" },
  },
  "ibiza.nightlife.Es Paradis": {
    en: { description: "Historical club with water party" },
    es: { description: "Club histórico con fiesta de agua" },
  },
  "ibiza.nightlife.Octan": {
    en: { description: "Independent techno club" },
    es: { description: "Club técnico independiente" },
  },
  "ibiza.nightlife.Akasha": {
    en: { description: "Underground club in Las Dalias" },
    es: { description: "Club subterráneo en Las Dalias" },
  },
  "ibiza.activities.Tour in barca con snorkeling": {
    en: { name: "Boat tour with snorkeling", description: "Hidden coves and crystal-clear waters" },
    es: { name: "Tour en barco con snorkel", description: "Calas escondidas y aguas cristalinas" },
  },
  "ibiza.activities.Gita a Formentera": {
    en: { name: "Trip to Formentera", description: "Catamaran trip to Ibiza’s sister island and its white beaches" },
    es: { name: "Excursión a Formentera", description: "Excursión en catamarán a la isla vecina y sus playas blancas" },
  },
  "ibiza.activities.Sunset boat party": {
    en: { name: "Sunset boat party", description: "Sunset party with DJ on board" },
    es: { name: "Fiesta en barco al atardecer", description: "Fiesta al atardecer con DJ a bordo" },
  },
  "ibiza.activities.Quad tour nell'entroterra": {
    en: { name: "Quad tour in the hinterland", description: "Offroad adventure between coves and villages" },
    es: { name: "Tour en quad por el interior", description: "Aventura todoterreno entre calas y pueblos" },
  },
  "ibiza.activities.Es Vedrà boat tour": {
    en: { name: "Es Vedrà boat tour", description: "Approaching the most famous magnetic island" },
    es: { name: "Tour en barco a Es Vedrà", description: "Acércate a la isla magnética más famosa" },
  },
  "ibiza.activities.Tour Dalt Vila": {
    en: { name: "Tour Dalt Vila", description: "Guided tour of the UNESCO heritage centre" },
    es: { name: "Tour Dalt Vila", description: "Visita guiada al centro de patrimonio de la UNESCO" },
  },
  "ibiza.activities.Cala Comte e Cala Salada": {
    en: { name: "Cala Comte and Cala Salada", description: "The most photographed beaches in Ibiza" },
    es: { name: "Cala Comte y Cala Salada", description: "Las playas más fotografiadas de Ibiza" },
  },
  "ibiza.activities.Las Dalias hippie market": {
    en: { name: "Las Dalias hippie market", description: "Iconic market open since 1985" },
    es: { name: "Mercadillo hippy de Las Dalias", description: "Mercadillo icónico abierto desde 1985" },
  },
  "ibiza.activities.Boat party Ocean Beach": {
    en: { name: "Ocean Beach boat party", description: "A daytime party, Ibiza style" },
    es: { name: "Fiesta en barco Ocean Beach", description: "Fiesta diurna al estilo ibicenco" },
  },
  "ibiza.activities.Jet ski safari": {
    en: { name: "Jet ski safari", description: "Coastal tour at full speed" },
    es: { name: "Jet ski safari", description: "Tour costero a toda velocidad" },
  },
  "barcelona.restaurants.Tickets": {
    en: { description: "Creative Tapas of the Brothers Adrià" },
    es: { description: "Tapas creativas de los Hermanos Adrià" },
  },
  "barcelona.restaurants.Disfrutar": {
    en: { description: "Stella Michelin, research kitchen" },
    es: { description: "Stella Michelin, cocina de investigación" },
  },
  "barcelona.restaurants.Cervecería Catalana": {
    en: { description: "Tapas classic always full" },
    es: { description: "Tapas clásico siempre completo" },
  },
  "barcelona.restaurants.Bar del Pla": {
    en: { description: "Modern Tapas in Born" },
    es: { description: "Tapas modernas en Born" },
  },
  "barcelona.restaurants.Can Solé": {
    en: { description: "Historic paella at Barceloneta" },
    es: { description: "Paella histórica en Barceloneta" },
  },
  "barcelona.restaurants.Bodega 1900": {
    en: { description: "Vermut and tapas of the Adrià" },
    es: { description: "Vermut y tapas del Adrià" },
  },
  "barcelona.restaurants.Paco Meralgo": {
    en: { description: "Fine tapas near Diagonal" },
    es: { description: "Bellas tapas cerca de Diagonal" },
  },
  "barcelona.restaurants.Quimet & Quimet": {
    en: { description: "Montaditos standing at the counter" },
    es: { description: "Montaditos de pie en el mostrador" },
  },
  "barcelona.restaurants.La Cova Fumada": {
    en: { description: "Tradition at Barceloneta, try the bombs" },
    es: { description: "Tradición en Barceloneta, prueba las bombas" },
  },
  "barcelona.restaurants.El Xampanyet": {
    en: { description: "Cava and tapas since 1929" },
    es: { description: "Cava y tapas desde 1929" },
  },
  "barcelona.bars.Paradiso": {
    en: { description: "Speakeasy entered the World's 50 Best Bars" },
    es: { description: "Talkeasy entró en los 50 mejores bares del mundo" },
  },
  "barcelona.bars.Two Schmucks": {
    en: { description: "Cocktail bar award-winning in Raval" },
    es: { description: "Cocktail bar galardonado en Raval" },
  },
  "barcelona.bars.Sips": {
    en: { description: "Cocktail bar among the best in the world" },
    es: { description: "Bar de cócteles entre los mejores del mundo" },
  },
  "barcelona.bars.Caribbean Club": {
    en: { description: "Historic bar in Gòtic" },
    es: { description: "Histórico bar en Gòtic" },
  },
  "barcelona.bars.Dr. Stravinsky": {
    en: { description: "Search cocktail with herbs" },
    es: { description: "Buscar cóctel con hierbas" },
  },
  "barcelona.bars.Boadas": {
    en: { description: "The oldest cocktail bar in the city (1933)" },
    es: { description: "El bar de cócteles más antiguo de la ciudad (1933)" },
  },
  "barcelona.bars.Old Fashioned": {
    en: { description: "Cocktail Bar Elegant" },
    es: { description: "Cocktail Bar Elegante" },
  },
  "barcelona.bars.Bobby's Free": {
    en: { description: "Speakeasy with barber at the entrance" },
    es: { description: "Habla con barbero en la entrada" },
  },
  "barcelona.bars.El Diset": {
    en: { description: "Natural wines and cocktails" },
    es: { description: "Vinos y cócteles naturales" },
  },
  "barcelona.bars.Solange": {
    en: { description: "James Bond style cocktail bar" },
    es: { description: "James Bond estilo cóctel bar" },
  },
  "barcelona.nightlife.Opium Barcelona": {
    en: { description: "Beachfront Club with Big DJs" },
    es: { description: "Beachfront Club con Big DJs" },
  },
  "barcelona.nightlife.Pacha Barcelona": {
    en: { description: "iconic brand also at BCN" },
    es: { description: "marca icónica también en BCN" },
  },
  "barcelona.nightlife.Razzmatazz": {
    en: { description: "5 rooms, all musical genres" },
    es: { description: "5 habitaciones, todos los géneros musicales" },
  },
  "barcelona.nightlife.Sutton Club": {
    en: { description: "Exclusive disco on Tuset" },
    es: { description: "Disco exclusivo en Tuset" },
  },
  "barcelona.nightlife.Otto Zutz": {
    en: { description: "3 different music plans" },
    es: { description: "3 diferentes planes de música" },
  },
  "barcelona.nightlife.Shôko": {
    en: { description: "Dinner, DJ and sea at Port Olímpic" },
    es: { description: "Cena, DJ y mar en Port Olímpic" },
  },
  "barcelona.nightlife.Apolo": {
    en: { description: "Club indie and electronics" },
    es: { description: "Club indie y electrónica" },
  },
  "barcelona.nightlife.City Hall": {
    en: { description: "Central disco in Plaça Catalunya" },
    es: { description: "Central discoteca en Plaça Catalunya" },
  },
  "barcelona.nightlife.Bling Bling": {
    en: { description: "Trendy disco in Diagonal" },
    es: { description: "Disco de moda en Diagonal" },
  },
  "barcelona.nightlife.Catwalk": {
    en: { description: "Elegant disco at Port Olímpic" },
    es: { description: "Elegante discoteca en Port Olímpic" },
  },
  "barcelona.activities.Sagrada Família skip-the-line": {
    en: { name: "Sagrada Família skip-the-line", description: "Priority entrance to Gaudí's masterpiece" },
    es: { name: "Sagrada Família sin colas", description: "Entrada prioritaria a la obra maestra de Gaudí" },
  },
  "barcelona.activities.Park Güell": {
    en: { name: "Park Güell", description: "Guided tour of the most colorful park in Europe" },
    es: { name: "Park Güell", description: "Visita guiada del parque más colorido de Europa" },
  },
  "barcelona.activities.Casa Batlló": {
    en: { name: "Casa Batlló", description: "immersive visit with augmented reality" },
    es: { name: "Casa Batlló", description: "visita inmersiva con realidad aumentada" },
  },
  "barcelona.activities.Camp Nou Experience": {
    en: { name: "Camp Nou Experience", description: "Barcelona Stadium Tour" },
    es: { name: "Camp Nou Experience", description: "Tour del estadio del Barcelona" },
  },
  "barcelona.activities.Quartiere Gotico": {
    en: { name: "Gothic Quarter", description: "Walking tour in the medieval heart" },
    es: { name: "Barrio Gótico", description: "Paseo en el corazón medieval" },
  },
  "barcelona.activities.Tour delle tapas": {
    en: { name: "Tapas Tour", description: "Guided gastronomic tasting" },
    es: { name: "Tour de Tapas", description: "Degustación gastronómica guiada" },
  },
  "barcelona.activities.Montjuïc cable car": {
    en: { name: "Montjuïc cable car", description: "Cable car with city view" },
    es: { name: "Teleférico de Montjuïc", description: "Teleférico con vistas a la ciudad" },
  },
  "barcelona.activities.Spettacolo flamenco": {
    en: { name: "Flamenco show", description: "Traditional Tablao with Dinner" },
    es: { name: "Espectáculo de flamenco", description: "Tablao tradicional con cena" },
  },
  "barcelona.activities.Day trip a Montserrat": {
    en: { name: "Day trip to Montserrat", description: "Monastery and nature outside the city" },
    es: { name: "Viaje de día a Montserrat", description: "Monasterio y naturaleza fuera de la ciudad" },
  },
  "barcelona.activities.Tour in catamarano": {
    en: { name: "Catamaran Tour", description: "Navigation along the coast of BCN" },
    es: { name: "Tour de Catamarán", description: "Navegación por la costa de BCN" },
  },
  "prague.restaurants.Lokál Dlouhááá": {
    en: { description: "Traditional Czech cuisine and perfect Pilsner beer" },
    es: { description: "Cocina tradicional checa y cerveza perfecta Pilsner" },
  },
  "prague.restaurants.Café Savoy": {
    en: { description: "Historic coffee with fine cuisine" },
    es: { description: "Café histórico con buena cocina" },
  },
  "prague.restaurants.La Degustation Bohême Bourgeoise": {
    en: { description: "Stella Michelin, tasting menu" },
    es: { description: "Stella Michelin, menú degustación" },
  },
  "prague.restaurants.Field Restaurant": {
    en: { description: "Stella Michelin, creative cuisine" },
    es: { description: "Stella Michelin, cocina creativa" },
  },
  "prague.restaurants.U Modré Kachničky": {
    en: { description: "Duck and game in classic style" },
    es: { description: "Pato y juego en estilo clásico" },
  },
  "prague.restaurants.Mlejnice": {
    en: { description: "Czech history in the centre" },
    es: { description: "Historia checa en el centro" },
  },
  "prague.restaurants.Eska": {
    en: { description: "Modern kitchen in the former Karlín factory" },
    es: { description: "Cocina moderna en la antigua fábrica Karlín" },
  },
  "prague.restaurants.U Glaubiců": {
    en: { description: "Beer and classic Czechs in Mala Strana" },
    es: { description: "Cerveza y checos clásicos en Mala Strana" },
  },
  "prague.restaurants.Sansho": {
    en: { description: "Asian Fusion Level" },
    es: { description: "Asian Fusion Level" },
  },
  "prague.restaurants.Kalina Anežka": {
    en: { description: "French-Czech refined kitchen" },
    es: { description: "Cocina francesa y elegante" },
  },
  "prague.bars.Hemingway Bar": {
    en: { description: "Cocktail bar in the World's 50 Best" },
    es: { description: "Coctelería incluida en The World's 50 Best Bars" },
  },
  "prague.bars.Black Angel's Bar": {
    en: { description: "Speakeasy in the underground of the U Prince Hotel" },
    es: { description: "Speakeasy en el sótano del Hotel U Prince" },
  },
  "prague.bars.AnonymouS Bar": {
    en: { description: "V for Vendetta-themed bar" },
    es: { description: "Bar inspirado en V de Vendetta" },
  },
  "prague.bars.Bugsy's Bar": {
    en: { description: "American style cocktail bar" },
    es: { description: "Bar de cócteles estilo americano" },
  },
  "prague.bars.Cash Only": {
    en: { description: "Cocktail niche bar" },
    es: { description: "Cocktail niche bar" },
  },
  "prague.bars.L'Fleur": {
    en: { description: "Elegant bar in Anežská" },
    es: { description: "Elegante bar en Anežská" },
  },
  "prague.bars.ParlourBar": {
    en: { description: "Cocktail bar intimate" },
    es: { description: "Cocktail bar íntima" },
  },
  "prague.bars.Cobra": {
    en: { description: "Bar with innovative cocktail menu" },
    es: { description: "Bar con menú innovador de cócteles" },
  },
  "prague.bars.Manifesto Market": {
    en: { description: "Food market with outdoor bar" },
    es: { description: "Mercado de alimentos con bar al aire libre" },
  },
  "prague.bars.BarBar": {
    en: { description: "Cocktail bar in the Jewish Quarter" },
    es: { description: "Bar de cócteles en el barrio judío" },
  },
  "prague.nightlife.Karlovy Lázně": {
    en: { description: "The largest club in Central Europe, 5 floors" },
    es: { description: "El club más grande de Europa Central, 5 plantas" },
  },
  "prague.nightlife.Roxy": {
    en: { description: "Electronic clubs and concerts" },
    es: { description: "Club de música electrónica y conciertos" },
  },
  "prague.nightlife.Cross Club": {
    en: { description: "Unique Industrial Disco in the World" },
    es: { description: "Disco industrial único en el mundo" },
  },
  "prague.nightlife.Lucerna Music Bar": {
    en: { description: "Local history for concerts and 80s/90s nights" },
    es: { description: "Historia local para conciertos y noches 80/90" },
  },
  "prague.nightlife.M1 Lounge": {
    en: { description: "Cocktail bar and central disco" },
    es: { description: "Bar de cócteles y discoteca central" },
  },
  "prague.nightlife.Sasazu": {
    en: { description: "Luxury Asian Disco" },
    es: { description: "Disco asiático de lujo" },
  },
  "prague.nightlife.Duplex": {
    en: { description: "Club on the roof in Wenceslas Square" },
    es: { description: "Club en el techo en la Plaza de Wenceslao" },
  },
  "prague.nightlife.Mecca Club": {
    en: { description: "Disco house elegant" },
    es: { description: "Disco house elegante" },
  },
  "prague.nightlife.Chapeau Rouge": {
    en: { description: "Legendary Club in the Center" },
    es: { description: "Club Legendario en el Centro" },
  },
  "prague.nightlife.Epic Prague": {
    en: { description: "Club of techno and house" },
    es: { description: "Club de techno y house" },
  },
  "prague.activities.Castello di Praga": {
    en: { name: "Prague Castle", description: "Guided tour of the oldest complex" },
    es: { name: "Castillo de Praga", description: "Visita guiada del complejo más antiguo" },
  },
  "prague.activities.Crociera sulla Moldava": {
    en: { name: "Vltava River cruise", description: "Panoramic views of the city from the water" },
    es: { name: "Crucero por el Moldava", description: "Vista panorámica de la ciudad desde el agua" },
  },
  "prague.activities.Tour della birra": {
    en: { name: "Beer tour", description: "Tastings in historic breweries" },
    es: { name: "Tour de la cerveza", description: "Degustación en cervecerías históricas" },
  },
  "prague.activities.Tour dei fantasmi": {
    en: { name: "Ghost tour", description: "Night-time legends in the Old Town" },
    es: { name: "Tour de fantasmas", description: "Leyendas nocturnas en el casco antiguo" },
  },
  "prague.activities.Quartiere ebraico": {
    en: { name: "Jewish Quarter", description: "Synagogues and Jewish cemetery" },
    es: { name: "Juderías", description: "Sinagogas y cementerio judío" },
  },
  "prague.activities.Orologio astronomico": {
    en: { name: "Astronomical Clock", description: "Climb the Old Town Hall tower" },
    es: { name: "Reloj astronómico", description: "Sube a la torre del Ayuntamiento" },
  },
  "prague.activities.Day trip Český Krumlov": {
    en: { name: "Český Krumlov day trip", description: "A fairytale UNESCO-listed town" },
    es: { name: "Excursión a Český Krumlov", description: "Una ciudad de cuento declarada Patrimonio de la Humanidad" },
  },
  "prague.activities.Tour del comunismo": {
    en: { name: "Communism Tour", description: "The Soviet Prague" },
    es: { name: "Tour del comunismo", description: "La Praga soviética" },
  },
  "prague.activities.Tour della vodka e assenzio": {
    en: { name: "Vodka and absinthe tour", description: "A tasting of Czech spirits" },
    es: { name: "Tour de vodka y absenta", description: "Degustación de licores checos" },
  },
  "prague.activities.Crociera con cena": {
    en: { name: "Cruise with dinner", description: "Romantic evening sailing" },
    es: { name: "Crucero con cena", description: "Navegación romántica al anochecer" },
  },
  "budapest.restaurants.Costes": {
    en: { description: "First Michelin star in Budapest" },
    es: { description: "Primera estrella Michelin en Budapest" },
  },
  "budapest.restaurants.Borkonyha Winekitchen": {
    en: { description: "Stella Michelin, modern Hungarian cuisine" },
    es: { description: "Stella Michelin, cocina moderna húngara" },
  },
  "budapest.restaurants.Onyx": {
    en: { description: "Two Michelin stars in the heart of the city" },
    es: { description: "Dos estrellas Michelin en el corazón de la ciudad" },
  },
  "budapest.restaurants.Stand Restaurant": {
    en: { description: "Stella Michelin with creative cuisine" },
    es: { description: "Stella Michelin con cocina creativa" },
  },
  "budapest.restaurants.Mák Bistro": {
    en: { description: "Contemporary Hungarian cuisine" },
    es: { description: "Cocina húngara contemporánea" },
  },
  "budapest.restaurants.Hungarikum Bisztró": {
    en: { description: "Traditional Hungarian specialties" },
    es: { description: "Especialidades tradicionales húngaras" },
  },
  "budapest.restaurants.Menza": {
    en: { description: "Hungarian retro style kitchen" },
    es: { description: "Cocina de estilo retro húngaro" },
  },
  "budapest.restaurants.Café Gerbeaud": {
    en: { description: "Historical coffee from 1858" },
    es: { description: "Café histórico de 1858" },
  },
  "budapest.restaurants.Comme Chez Soi": {
    en: { description: "Italian cuisine" },
    es: { description: "Cocina italiana" },
  },
  "budapest.restaurants.Két Szerecsen": {
    en: { description: "Bistrot international trend" },
    es: { description: "Bistrot international trend" },
  },
  "budapest.bars.Szimpla Kert": {
    en: { description: "The first and most famous ruin pub" },
    es: { description: "El primer y más famoso pub de ruina" },
  },
  "budapest.bars.Instant-Fogasház": {
    en: { description: "Mega ruin pub with 7 bars and 4 tracks" },
    es: { description: "Mega pub con 7 bares y 4 pistas" },
  },
  "budapest.bars.Mazel Tov": {
    en: { description: "Ruin pub in the Jewish Quarter, great food" },
    es: { description: "pub Ruin en el barrio judío, gran comida" },
  },
  "budapest.bars.Doboz": {
    en: { description: "Ruin pub elegant with artistic installations" },
    es: { description: "Ruin pub elegante con instalaciones artísticas" },
  },
  "budapest.bars.Hello Baby": {
    en: { description: "Cocktail trendy bar" },
    es: { description: "Cocktail trendy bar" },
  },
  "budapest.bars.Anker't": {
    en: { description: "Interior courtyard with music and cocktail" },
    es: { description: "Patio interior con música y cóctel" },
  },
  "budapest.bars.Csendes Vintage": {
    en: { description: "Rear bar with 60's furniture" },
    es: { description: "Rear bar con muebles de 60" },
  },
  "budapest.bars.Kőleves Kert": {
    en: { description: "Summer garden in the Jewish quarter" },
    es: { description: "Jardín de verano en el barrio judío" },
  },
  "budapest.bars.Ellátó Kert": {
    en: { description: "Ruin pub in Mexican style" },
    es: { description: "pub Ruin en estilo mexicano" },
  },
  "budapest.bars.Telep": {
    en: { description: "Art bar in Erzsébetváros" },
    es: { description: "Bar de arte en Erzsébetváros" },
  },
  "budapest.nightlife.Akvárium Klub": {
    en: { description: "Club concerts under the square Erzsébet" },
    es: { description: "Conciertos del Club bajo la plaza Erzsébet" },
  },
  "budapest.nightlife.A38": {
    en: { description: "Disco on a Ukrainian ship on the Danube" },
    es: { description: "Disco sobre un barco ucraniano en el Danubio" },
  },
  "budapest.nightlife.Lärm": {
    en: { description: "Temple of underground techno" },
    es: { description: "Templo del techno underground" },
  },
  "budapest.nightlife.Aether": {
    en: { description: "Elegant club for house" },
    es: { description: "Club elegante de música house" },
  },
  "budapest.nightlife.Toldi Klub": {
    en: { description: "Cinema-club for drum&bass" },
    es: { description: "Cine-club de drum and bass" },
  },
  "budapest.nightlife.Dürer Kert": {
    en: { description: "Club indie and rock" },
    es: { description: "Club indie y rock" },
  },
  "budapest.nightlife.Corvintető": {
    en: { description: "Roof club with panoramic view" },
    es: { description: "Club de techo con vista panorámica" },
  },
  "budapest.nightlife.Bestiario": {
    en: { description: "Electronic music club" },
    es: { description: "Club de música electrónica" },
  },
  "budapest.nightlife.Ötkert": {
    en: { description: "Central disco, commercial" },
    es: { description: "Central disco, comercial" },
  },
  "budapest.nightlife.Spíler Shanghai": {
    en: { description: "Disco with Asian menu" },
    es: { description: "Disco con menú asiático" },
  },
  "budapest.activities.Bagni Széchenyi": {
    en: { name: "Széchenyi Baths", description: "The largest thermal baths in Europe" },
    es: { name: "Baños Széchenyi", description: "Los baños termales más grandes de Europa" },
  },
  "budapest.activities.Crociera sul Danubio": {
    en: { name: "Cruise on the Danube", description: "Panoramic navigation with dinner" },
    es: { name: "Crucero en el Danubio", description: "Navegación panorámica con cena" },
  },
  "budapest.activities.Castello di Buda": {
    en: { name: "Buda Castle", description: "Guided tour of the Royal Quarter" },
    es: { name: "Castillo de Buda", description: "Visita guiada del Barrio Real" },
  },
  "budapest.activities.Ruin pubs tour": {
    en: { name: "Ruin pubs tour", description: "Pub crawl in the Jewish Quarter" },
    es: { name: "Tour de ruin pubs", description: "Ruta de bares por el barrio judío" },
  },
  "budapest.activities.Parlamento": {
    en: { name: "Parliament", description: "Inside tour of the symbol of the city" },
    es: { name: "Parlamento", description: "Visita interior del símbolo de la ciudad" },
  },
  "budapest.activities.Bastione dei Pescatori": {
    en: { name: "Fishermen's Bastion", description: "Spectacular panoramic view" },
    es: { name: "Bastion de pescadores", description: "Espectacular vista panorámica" },
  },
  "budapest.activities.Sinagoga di Dohány": {
    en: { name: "Synagogue of Dohány", description: "The largest synagogue in Europe" },
    es: { name: "Sinagoga de Dohány", description: "La sinagoga más grande de Europa" },
  },
  "budapest.activities.Tour gastronomico": {
    en: { name: "Food tour", description: "Goulash, lángos and Hungarian wines" },
    es: { name: "Tour gastronómico", description: "Goulash, lángos y vinos húngaros" },
  },
  "budapest.activities.Memento Park": {
    en: { name: "Memento Park", description: "Statues of the Communist era" },
    es: { name: "Memento Park", description: "Estatuas de la era comunista" },
  },
  "budapest.activities.Caves tour": {
    en: { name: "Caves tour", description: "Explore caves under Buda" },
    es: { name: "Tour de las cuevas", description: "Explora las cuevas bajo Buda" },
  },
  "krakow.restaurants.Pod Nosem": {
    en: { description: "Fine Polish cuisine in Kazimierz" },
    es: { description: "Cocina polaca fina en Kazimierz" },
  },
  "krakow.restaurants.Szara Gęś": {
    en: { description: "Elegance in the market square" },
    es: { description: "Elegancia en la plaza del mercado" },
  },
  "krakow.restaurants.Trzy Rybki": {
    en: { description: "Creative Polish cuisine at Stary Hotel" },
    es: { description: "Cocina creativa polaca en Stary Hotel" },
  },
  "krakow.restaurants.Bottiglieria 1881": {
    en: { description: "Stella Michelin, self-catering" },
    es: { description: "Stella Michelin, independiente" },
  },
  "krakow.restaurants.Miód Malina": {
    en: { description: "Polish Tradition in the Center" },
    es: { description: "Tradición polaca en el centro" },
  },
  "krakow.restaurants.Hawełka": {
    en: { description: "Historical Polish cuisine since 1876" },
    es: { description: "Cocina histórica polaca desde 1876" },
  },
  "krakow.restaurants.Pierogarnia Krakowiacy": {
    en: { description: "The best pierogi in the city" },
    es: { description: "El mejor pierogi de la ciudad" },
  },
  "krakow.restaurants.Starka": {
    en: { description: "Polish cuisine with home vodka" },
    es: { description: "Cocina polaca con vodka casero" },
  },
  "krakow.restaurants.Plaża Kraków": {
    en: { description: "Urban beach with international cuisine" },
    es: { description: "Playa urbana con cocina internacional" },
  },
  "krakow.restaurants.Boscaiola": {
    en: { description: "Italian level" },
    es: { description: "Nivel italiano" },
  },
  "krakow.bars.Mercy Brown": {
    en: { description: "Speakeasy of excellence" },
    es: { description: "Hablando de excelencia" },
  },
  "krakow.bars.Hush Live": {
    en: { description: "Cocktail bar with live music" },
    es: { description: "Bar de cócteles con música en vivo" },
  },
  "krakow.bars.Singer": {
    en: { description: "Historic bar with sewing machines as tables" },
    es: { description: "Barra histórica con máquinas de coser como tablas" },
  },
  "krakow.bars.Alchemia": {
    en: { description: "Kazimierz iconic bohémien bar" },
    es: { description: "Kazimierz icónico bohémien bar" },
  },
  "krakow.bars.Eszeweria": {
    en: { description: "Vintage atmosphere in Kazimierz" },
    es: { description: "Ambiente vintage en Kazimierz" },
  },
  "krakow.bars.Hevre": {
    en: { description: "Bars in former synagogue" },
    es: { description: "Bares en la antigua sinagoga" },
  },
  "krakow.bars.Movida": {
    en: { description: "International cocktail bar" },
    es: { description: "International cocktail bar" },
  },
  "krakow.bars.BAL": {
    en: { description: "Bar and bistro in Zabłocie" },
    es: { description: "Bar y bistro en Santa Bárbara" },
  },
  "krakow.bars.Karma": {
    en: { description: "Cocktail Bar Elegant" },
    es: { description: "Cocktail Bar Elegante" },
  },
  "krakow.bars.Ambasada Śledzia": {
    en: { description: "Vodka and herring as tradition wants" },
    es: { description: "Vodka y arenque como tradición quiere" },
  },
  "krakow.nightlife.Prozak 2.0": {
    en: { description: "Disco underground in medieval cellar" },
    es: { description: "Disco subterráneo en el sótano medieval" },
  },
  "krakow.nightlife.Frantic": {
    en: { description: "Central commercial disco" },
    es: { description: "Central commercial disco" },
  },
  "krakow.nightlife.Kitsch Klub": {
    en: { description: "lively LGBTQ+ disco" },
    es: { description: "lively LGBTQ+ disco" },
  },
  "krakow.nightlife.Cień Klub": {
    en: { description: "Disco in the cellar in the center" },
    es: { description: "Disco en el sótano en el centro" },
  },
  "krakow.nightlife.Shine": {
    en: { description: "Club electronic and house" },
    es: { description: "Club de música electrónica y house" },
  },
  "krakow.nightlife.Drukarnia": {
    en: { description: "Bar with live music in Podgórze" },
    es: { description: "Bar con música en vivo en Podgórze" },
  },
  "krakow.nightlife.Showtime": {
    en: { description: "Disco with karaoke and cabaret" },
    es: { description: "Disco con karaoke y cabaret" },
  },
  "krakow.nightlife.Coco Music Club": {
    en: { description: "Central commercial club" },
    es: { description: "Club comercial central" },
  },
  "krakow.nightlife.Strefa 22": {
    en: { description: "Disco with music from the 1980s and 1990s" },
    es: { description: "Disco con música de los años 80 y 1990" },
  },
  "krakow.nightlife.Choice Club": {
    en: { description: "Electronic music club" },
    es: { description: "Club de música electrónica" },
  },
  "krakow.activities.Auschwitz-Birkenau": {
    en: { name: "Auschwitz-Birkenau", description: "Guided tour of the memorial" },
    es: { name: "Auschwitz-Birkenau", description: "Visita guiada del memorial" },
  },
  "krakow.activities.Miniere di sale di Wieliczka": {
    en: { name: "Wieliczka Salt Mine", description: "An underground UNESCO World Heritage Site" },
    es: { name: "Mina de sal de Wieliczka", description: "Patrimonio subterráneo de la Humanidad" },
  },
  "krakow.activities.Castello del Wawel": {
    en: { name: "Wawel Castle", description: "Polish kings residence" },
    es: { name: "Castillo de Wawel", description: "Residencia de reyes polacos" },
  },
  "krakow.activities.Quartiere ebraico Kazimierz": {
    en: { name: "Jewish Quarter Kazimierz", description: "Cultural and gastronomic tour" },
    es: { name: "Juderías Kazimierz", description: "Visita cultural y gastronómica" },
  },
  "krakow.activities.Schindler Factory Museum": {
    en: { name: "Schindler Factory Museum", description: "History of Krakow during the War" },
    es: { name: "Schindler Factory Museum", description: "Historia de Cracovia durante la Guerra" },
  },
  "krakow.activities.Tour vodka": {
    en: { name: "Vodka tour", description: "A tasting of the best Polish vodkas" },
    es: { name: "Tour del vodka", description: "Degustación de los mejores vodkas polacos" },
  },
  "krakow.activities.Day trip Zakopane": {
    en: { name: "Zakopane day trip", description: "A trip into the Tatra Mountains" },
    es: { name: "Excursión a Zakopane", description: "Una escapada a los montes Tatra" },
  },
  "krakow.activities.Crociera sulla Vistola": {
    en: { name: "Vistula River cruise", description: "A panoramic cruise" },
    es: { name: "Crucero por el Vístula", description: "Navegación panorámica" },
  },
  "krakow.activities.Pub crawl": {
    en: { name: "Pub crawl", description: "Tour of the best breweries in the center" },
    es: { name: "Ruta de bares", description: "Tour por las mejores cervecerías del centro" },
  },
  "krakow.activities.Tour gastronomico polacco": {
    en: { name: "Polish gastronomic tour", description: "Pierogi, kielbasa and local specialities" },
    es: { name: "Tour gastronómico polaco", description: "Pierogi, kielbasa y especialidades locales" },
  },
  "amsterdam.restaurants.De Kas": {
    en: { description: "Farm-to-table kitchen in a historic greenhouse" },
    es: { description: "Cocina agrícola a mesa en un invernadero histórico" },
  },
  "amsterdam.restaurants.Foodhallen": {
    en: { description: "Food hall with international kitchens" },
    es: { description: "Comedor con cocina internacional" },
  },
  "amsterdam.restaurants.Pllek": {
    en: { description: "Beach restaurant in the north, relaxed vibe" },
    es: { description: "Restaurante de playa en el norte, ambiente relajado" },
  },
  "amsterdam.restaurants.Moeders": {
    en: { description: "Traditional Dutch cuisine authentic" },
    es: { description: "Cocina tradicional holandesa auténtica" },
  },
  "amsterdam.restaurants.The Pancake Bakery": {
    en: { description: "Classic Pannenkoeken on channels" },
    es: { description: "Classic Pannenkoeken en canales" },
  },
  "amsterdam.restaurants.Cafe de Klos": {
    en: { description: "The best city shooters" },
    es: { description: "Los mejores tiradores de la ciudad" },
  },
  "amsterdam.restaurants.Restaurant Greetje": {
    en: { description: "Modern Dutch cuisine" },
    es: { description: "Cocina holandesa moderna" },
  },
  "amsterdam.restaurants.Toscanini": {
    en: { description: "Historical Italian in Jordaan" },
    es: { description: "Italiano histórico en Jordaan" },
  },
  "amsterdam.restaurants.Bistro Bij Ons": {
    en: { description: "Dutch comfort food genuine" },
    es: { description: "comida de confort holandés genuina" },
  },
  "amsterdam.restaurants.Wilde Zwijnen": {
    en: { description: "Creative cuisine with local products" },
    es: { description: "Cocina creativa con productos locales" },
  },
  "amsterdam.bars.Tales & Spirits": {
    en: { description: "Cocktail bar in the central district" },
    es: { description: "Bar de cócteles en el distrito central" },
  },
  "amsterdam.bars.Pulitzer's Bar": {
    en: { description: "Elegant bar in the historic Pulitzer Hotel" },
    es: { description: "Elegante bar en el histórico Hotel Pulitzer" },
  },
  "amsterdam.bars.Door 74": {
    en: { description: "Speakeasy with mandatory reservation" },
    es: { description: "Habla con reserva obligatoria" },
  },
  "amsterdam.bars.Hiding in Plain Sight": {
    en: { description: "Cocktail bar hidden" },
    es: { description: "Cocktail bar oculto" },
  },
  "amsterdam.bars.Rosalia's Menagerie": {
    en: { description: "Cocktail bar in Pulitzer Hotel" },
    es: { description: "Bar de cócteles en Pulitzer Hotel" },
  },
  "amsterdam.bars.Vesper Bar": {
    en: { description: "Elegant cocktail in Jordaan" },
    es: { description: "Elegante cóctel en Jordaan" },
  },
  "amsterdam.bars.Flying Dutchmen Cocktails": {
    en: { description: "Level Mixology" },
    es: { description: "Mezcla de nivel" },
  },
  "amsterdam.bars.Bar Centraal": {
    en: { description: "Natural wines and tapas" },
    es: { description: "Vinos y tapas naturales" },
  },
  "amsterdam.bars.Café Brecht": {
    en: { description: "Berlin-inspired atmosphere near Leidseplein" },
    es: { description: "Ambiente berlinés cerca de Leidseplein" },
  },
  "amsterdam.bars.Wynand Fockink": {
    en: { description: "Historical Distillery from 1679" },
    es: { description: "Destilería histórica de 1679" },
  },
  "amsterdam.nightlife.De School": {
    en: { description: "Temple of electronic music" },
    es: { description: "Templo de la música electrónica" },
  },
  "amsterdam.nightlife.Shelter": {
    en: { description: "Underground techno club" },
    es: { description: "Underground techno club" },
  },
  "amsterdam.nightlife.Paradiso": {
    en: { description: "Iconica church deconsecrated transformed into club" },
    es: { description: "Iconica iglesia deconsagrada transformada en club" },
  },
  "amsterdam.nightlife.Melkweg": {
    en: { description: "Live music club and DJ set" },
    es: { description: "Club de música en vivo y DJ set" },
  },
  "amsterdam.nightlife.Jimmy Woo": {
    en: { description: "Exclusive disco in Leidseplein" },
    es: { description: "Disco exclusivo en Leidseplein" },
  },
  "amsterdam.nightlife.AIR Amsterdam": {
    en: { description: "Modern club with top sound system" },
    es: { description: "Club moderno con sistema de sonido superior" },
  },
  "amsterdam.nightlife.Club NYX": {
    en: { description: "LGBTQ+ friendly disco on 3 floors" },
    es: { description: "LGBTQ+ discoteca amigable en 3 plantas" },
  },
  "amsterdam.nightlife.Chicago Social Club": {
    en: { description: "Central club with resident DJ" },
    es: { description: "Club central con DJ residente" },
  },
  "amsterdam.nightlife.Bitterzoet": {
    en: { description: "Intimate club with eclectic music" },
    es: { description: "Club íntimo con música ecléctica" },
  },
  "amsterdam.nightlife.Club Lite": {
    en: { description: "Electronic club near Marineterrein" },
    es: { description: "Club electrónico cerca de Marineterrein" },
  },
  "amsterdam.activities.Crociera sui canali": {
    en: { name: "Canal cruise", description: "One hour on Amsterdam’s waterways" },
    es: { name: "Crucero por los canales", description: "Una hora por los canales de Ámsterdam" },
  },
  "amsterdam.activities.Museo Van Gogh": {
    en: { name: "Van Gogh Museum", description: "Skip-the-line to the most famous museum" },
    es: { name: "Museo Van Gogh", description: "Entrada sin colas al museo más famoso" },
  },
  "amsterdam.activities.Rijksmuseum": {
    en: { name: "Rijksmuseum", description: "Masterpieces by Rembrandt and Vermeer" },
    es: { name: "Rijksmuseum", description: "Obras maestras de Rembrandt y Vermeer" },
  },
  "amsterdam.activities.Casa di Anna Frank": {
    en: { name: "Anne Frank House", description: "Visit the historic hiding place" },
    es: { name: "Casa de Ana Frank", description: "Visita el refugio histórico" },
  },
  "amsterdam.activities.Heineken Experience": {
    en: { name: "Heineken Experience", description: "Dutch beer interactive tour" },
    es: { name: "Heineken Experience", description: "Tour interactivo de cerveza holandesa" },
  },
  "amsterdam.activities.Tour in bicicletta": {
    en: { name: "Bike tour", description: "Experience Amsterdam like the Dutch" },
    es: { name: "Tour en bicicleta", description: "Descubre Ámsterdam como los neerlandeses" },
  },
  "amsterdam.activities.Red Light District tour": {
    en: { name: "Red Light District Tour", description: "Guided tour of the red light district" },
    es: { name: "Red Light District Tour", description: "Visita guiada del distrito de luz roja" },
  },
  "amsterdam.activities.Coffee shop tour": {
    en: { name: "Coffee shop tour", description: "Explore local culture legally" },
    es: { name: "Tour de coffee shops", description: "Explora legalmente esta cultura local" },
  },
  "amsterdam.activities.Day trip Zaanse Schans": {
    en: { name: "Zaanse Schans day trip", description: "Windmills and traditional cheeses" },
    es: { name: "Excursión a Zaanse Schans", description: "Molinos de viento y quesos típicos" },
  },
  "amsterdam.activities.Pub crawl": {
    en: { name: "Pub crawl", description: "Night in the centre" },
    es: { name: "Ruta de bares", description: "Una noche por los locales del centro" },
  },
  "berlin.restaurants.Mustafas Gemüse Kebap": {
    en: { description: "The most famous kebab in Berlin" },
    es: { description: "El kebab más famoso de Berlín" },
  },
  "berlin.restaurants.Curry 36": {
    en: { description: "Currywurst city icon" },
    es: { description: "Currywurst icono de la ciudad" },
  },
  "berlin.restaurants.Burgermeister": {
    en: { description: "Burger under Schlesisches Tor Metro" },
    es: { description: "Burger bajo Schlesisches Tor Metro" },
  },
  "berlin.restaurants.Katz Orange": {
    en: { description: "Farm-to-table kitchen in Mitte" },
    es: { description: "Cocina de granja a mesa en Mitte" },
  },
  "berlin.restaurants.Nobelhart & Schmutzig": {
    en: { description: "Stella Michelin, local products" },
    es: { description: "Stella Michelin, productos locales" },
  },
  "berlin.restaurants.Restaurant Tim Raue": {
    en: { description: "Two Michelin stars, Asian cuisine" },
    es: { description: "Dos estrellas Michelin, cocina asiática" },
  },
  "berlin.restaurants.Lavanderia Vecchia": {
    en: { description: "Italian fine dining in Neukölln" },
    es: { description: "Cocina italiana en Neukölln" },
  },
  "berlin.restaurants.Markthalle Neun": {
    en: { description: "Street food market on Thursday evening" },
    es: { description: "Mercado de comida callejera el jueves por la noche" },
  },
  "berlin.restaurants.Konnopke's Imbiss": {
    en: { description: "Historical Currywurst in Prenzlauer Berg" },
    es: { description: "Currywurst histórico en Prenzlauer Berg" },
  },
  "berlin.restaurants.Lokal": {
    en: { description: "Modern German cuisine in Mitte" },
    es: { description: "Cocina alemana moderna en Mitte" },
  },
  "berlin.bars.Buck and Breck": {
    en: { description: "Cocktail bar speakeasy" },
    es: { description: "Cocktail bar talkeasy" },
  },
  "berlin.bars.Lebensstern": {
    en: { description: "Elegant cocktail bar in Schöneberg" },
    es: { description: "Elegante bar en Schöneberg" },
  },
  "berlin.bars.Beckett's Kopf": {
    en: { description: "Cocktail bar hidden in Prenzlauer Berg" },
    es: { description: "Cocktail bar oculto en Prenzlauer Berg" },
  },
  "berlin.bars.Schwarze Traube": {
    en: { description: "Cocktail bar of very high level" },
    es: { description: "Barra de cócteles de muy alto nivel" },
  },
  "berlin.bars.Würgeengel": {
    en: { description: "Historic cocktail bar in Kreuzberg" },
    es: { description: "histórico bar de cócteles en Kreuzberg" },
  },
  "berlin.bars.Velvet Bar": {
    en: { description: "Modern cocktails in Mitte" },
    es: { description: "Modernos cócteles en Mitte" },
  },
  "berlin.bars.Bar Tausend": {
    en: { description: "Speakeasy under the Friedrichstraße bridge" },
    es: { description: "Hablando bajo el puente Friedrichstraße" },
  },
  "berlin.bars.Le Croco Bleu": {
    en: { description: "Cocktail bar in former brewery" },
    es: { description: "Bar de cócteles en la antigua cervecería" },
  },
  "berlin.bars.Truffle Pig": {
    en: { description: "Cocktail trendy bar" },
    es: { description: "Cocktail trendy bar" },
  },
  "berlin.bars.Reingold": {
    en: { description: "Cocktail bar elegant years '20" },
    es: { description: "Cocktail bar elegante años '20" },
  },
  "berlin.nightlife.Berghain": {
    en: { description: "The world temple of techno" },
    es: { description: "El templo mundial de techno" },
  },
  "berlin.nightlife.Sisyphos": {
    en: { description: "Outdoor club with festival vibe" },
    es: { description: "Club al aire libre con festival vibe" },
  },
  "berlin.nightlife.Kater Blau": {
    en: { description: "Club on the river Spree" },
    es: { description: "Club en el río Spree" },
  },
  "berlin.nightlife.Watergate": {
    en: { description: "Club techno with river view" },
    es: { description: "Club techno con vista al río" },
  },
  "berlin.nightlife.Tresor": {
    en: { description: "Historic techno club in a former bank vault" },
    es: { description: "Histórico club techno en una antigua cámara acorazada" },
  },
  "berlin.nightlife.About Blank": {
    en: { description: "Queer-friendly club with garden" },
    es: { description: "Queer-friendly club con jardín" },
  },
  "berlin.nightlife.Renate": {
    en: { description: "Club indie and electronic nostalgic" },
    es: { description: "Club indie y nostálgico electrónico" },
  },
  "berlin.nightlife.KitKatClub": {
    en: { description: "Legendary fetish club" },
    es: { description: "Club de fetiche legendario" },
  },
  "berlin.nightlife.Suicide Circus": {
    en: { description: "Club techno level" },
    es: { description: "Club techno nivel" },
  },
  "berlin.nightlife.Club der Visionäre": {
    en: { description: "Outdoor water club" },
    es: { description: "Club de agua al aire libre" },
  },
  "berlin.activities.Brandenburg Gate": {
    en: { name: "Brandenburg Gate", description: "City symbol guided tour" },
    es: { name: "Puerta de Brandeburgo", description: "Visita guiada al símbolo de la ciudad" },
  },
  "berlin.activities.Reichstag": {
    en: { name: "Reichstag", description: "Visit to the dome of Parliament" },
    es: { name: "Reichstag", description: "Visita al Parlamento" },
  },
  "berlin.activities.East Side Gallery": {
    en: { name: "East Side Gallery", description: "Murales on the Berlin Wall" },
    es: { name: "East Side Gallery", description: "Murales en el Muro de Berlín" },
  },
  "berlin.activities.Memoriale dell'Olocausto": {
    en: { name: "Holocaust Memorial", description: "Memorial site in Mitte" },
    es: { name: "Monumento al Holocausto", description: "Lugar conmemorativo en Mitte" },
  },
  "berlin.activities.Checkpoint Charlie": {
    en: { name: "Checkpoint Charlie", description: "History of Cold War" },
    es: { name: "Punto de control Charlie", description: "Historia de la Guerra Fría" },
  },
  "berlin.activities.Museumsinsel": {
    en: { name: "Museum Island", description: "UNESCO-listed island of museums" },
    es: { name: "Isla de los Museos", description: "Conjunto de museos declarado Patrimonio de la Humanidad" },
  },
  "berlin.activities.Berlin Wall tour": {
    en: { name: "Berlin Wall tour", description: "History of the Wall told by bike" },
    es: { name: "Tour del Muro de Berlín", description: "La historia del Muro contada en bicicleta" },
  },
  "berlin.activities.Topografia del Terrore": {
    en: { name: "Topography of Terror", description: "Museum about the Gestapo" },
    es: { name: "Topografía del Terror", description: "Museo sobre la Gestapo" },
  },
  "berlin.activities.TV Tower (Fernsehturm)": {
    en: { name: "TV Tower (Fernsehturm)", description: "Panoramic view from 207m" },
    es: { name: "Torre de TV (Fernsehturm)", description: "Vista panorámica desde 207m" },
  },
  "berlin.activities.Pub crawl": {
    en: { name: "Pub crawl", description: "Night between Kreuzberg and Friedrichshain clubs" },
    es: { name: "Ruta de bares", description: "Noche por los clubes de Kreuzberg y Friedrichshain" },
  },
  "lisbon.restaurants.Belcanto": {
    en: { description: "Two Michelin stars by José Avillez" },
    es: { description: "Dos estrellas Michelin de José Avillez" },
  },
  "lisbon.restaurants.Cervejaria Ramiro": {
    en: { description: "Legendary crustaceans and seafood" },
    es: { description: "Cazacianos legendarios y mariscos" },
  },
  "lisbon.restaurants.Time Out Market": {
    en: { description: "Food hall with the best chefs in the city" },
    es: { description: "Comida con los mejores chefs de la ciudad" },
  },
  "lisbon.restaurants.Pastéis de Belém": {
    en: { description: "Original birth pastel from 1837" },
    es: { description: "Pastel de nacimiento original de 1837" },
  },
  "lisbon.restaurants.A Cevicheria": {
    en: { description: "Trendy Peruvian Ceviche" },
    es: { description: "Trendy Peru Ceviche" },
  },
  "lisbon.restaurants.Pinóquio": {
    en: { description: "Fresh fish in piazza Restauradores" },
    es: { description: "Pescado fresco en piazza Restauradores" },
  },
  "lisbon.restaurants.A Taberna da Rua das Flores": {
    en: { description: "Creative Portuguese Tapas" },
    es: { description: "Tapas portuguesas creativas" },
  },
  "lisbon.restaurants.Solar dos Presuntos": {
    en: { description: "Traditional Portuguese cuisine" },
    es: { description: "Cocina tradicional portuguesa" },
  },
  "lisbon.restaurants.Cantinho do Avillez": {
    en: { description: "Bistro by José Avillez" },
    es: { description: "Bistro por José Avillez" },
  },
  "lisbon.restaurants.100 Maneiras": {
    en: { description: "Creative cuisine with tasting menu" },
    es: { description: "Cocina creativa con menú degustación" },
  },
  "lisbon.bars.Pensão Amor": {
    en: { description: "Trending bars in former brothel" },
    es: { description: "Barritas de moda en el antiguo burdel" },
  },
  "lisbon.bars.Park Bar": {
    en: { description: "Rooftop over a parking lot with breathtaking views" },
    es: { description: "azotea sobre un estacionamiento con vistas impresionantes" },
  },
  "lisbon.bars.Cinco Lounge": {
    en: { description: "Elegant cocktail bar in Príncipe Real" },
    es: { description: "Elegante bar de cócteles en Príncipe Real" },
  },
  "lisbon.bars.Foxtrot": {
    en: { description: "Historical speakereasy" },
    es: { description: "Altavoz histórico" },
  },
  "lisbon.bars.Topo Chiado": {
    en: { description: "Rooftop overlooking Castelo de São Jorge" },
    es: { description: "azotea con vistas a Castelo de São Jorge" },
  },
  "lisbon.bars.Lost In": {
    en: { description: "Bar with views of Lisbon rooftops" },
    es: { description: "Bar con vistas a las azoteas de Lisboa" },
  },
  "lisbon.bars.Pavilhão Chinês": {
    en: { description: "Curious bar with relics from all over the world" },
    es: { description: "Curioso bar con reliquias de todo el mundo" },
  },
  "lisbon.bars.Memmo Alfama Rooftop": {
    en: { description: "View of Alfama and Tejo" },
    es: { description: "Vista de Alfama y Tejo" },
  },
  "lisbon.bars.Sky Bar Tivoli": {
    en: { description: "Hightail on Avenida da Liberdade" },
    es: { description: "Hightail en Avenida da Liberdade" },
  },
  "lisbon.bars.Procópio Bar": {
    en: { description: "Historic bar in retro style" },
    es: { description: "Barra histórica en estilo retro" },
  },
  "lisbon.nightlife.Lux Frágil": {
    en: { description: "The most famous club in Lisbon" },
    es: { description: "El club más famoso de Lisboa" },
  },
  "lisbon.nightlife.Ministerium": {
    en: { description: "Elegant Club in Praça do Comércio" },
    es: { description: "Elegante Club en Praça do Comércio" },
  },
  "lisbon.nightlife.K Urban Beach": {
    en: { description: "Club on the River Tejo" },
    es: { description: "Club en el río Tejo" },
  },
  "lisbon.nightlife.Music Box": {
    en: { description: "Club under a bow in Cais do Sodré" },
    es: { description: "Club bajo un arco en Cais do Sodré" },
  },
  "lisbon.nightlife.Lust in Rio": {
    en: { description: "Outdoor tropical club" },
    es: { description: "Club tropical al aire libre" },
  },
  "lisbon.nightlife.Plateau": {
    en: { description: "Elegant disco in Príncipe Real" },
    es: { description: "Elegante discoteca en Príncipe Real" },
  },
  "lisbon.nightlife.Construction": {
    en: { description: "Club LGBTQ+ in Cais do Sodré" },
    es: { description: "Club LGBTQ+ en Cais do Sodré" },
  },
  "lisbon.nightlife.Trumps": {
    en: { description: "Icon club LGBTQ +" },
    es: { description: "Icon club LGBTQ +" },
  },
  "lisbon.nightlife.Pensão Amor": {
    en: { description: "Also dance floor on weekends" },
    es: { description: "También pista de baile los fines de semana" },
  },
  "lisbon.nightlife.Casino Lisboa": {
    en: { description: "Casinos with DJs and shows" },
    es: { description: "Casinos con DJs y shows" },
  },
  "lisbon.activities.Torre di Belém": {
    en: { name: "Tower of Belém", description: "Symbol of the Age of Discoveries" },
    es: { name: "Torre de Belém", description: "Símbolo de la Era de los Descubrimientos" },
  },
  "lisbon.activities.Monastero dos Jerónimos": {
    en: { name: "Jerónimos Monastery", description: "A Manueline masterpiece and UNESCO World Heritage Site" },
    es: { name: "Monasterio de los Jerónimos", description: "Obra maestra manuelina declarada Patrimonio de la Humanidad" },
  },
  "lisbon.activities.Tram 28": {
    en: { name: "Tram 28", description: "Panoramic tour in historic districts" },
    es: { name: "Tranvía 28", description: "Recorrido panorámico por los barrios históricos" },
  },
  "lisbon.activities.Castello di San Giorgio": {
    en: { name: "São Jorge Castle", description: "Breathtaking view of the city" },
    es: { name: "Castillo de San Jorge", description: "Vista impresionante de la ciudad" },
  },
  "lisbon.activities.Day trip a Sintra": {
    en: { name: "Sintra day trip", description: "Pena Palace and a fairytale village" },
    es: { name: "Excursión a Sintra", description: "Palacio da Pena y un pueblo de cuento" },
  },
  "lisbon.activities.Quartiere di Alfama": {
    en: { name: "Alfama district", description: "Guided tour through the historic heart" },
    es: { name: "Barrio de Alfama", description: "Visita guiada por el corazón histórico" },
  },
  "lisbon.activities.Crociera sul Tago": {
    en: { name: "Tagus River cruise", description: "See Lisbon from the water" },
    es: { name: "Crucero por el Tajo", description: "Descubre Lisboa desde el agua" },
  },
  "lisbon.activities.Time Out Market": {
    en: { name: "Time Out Market", description: "Full gastronomic experience" },
    es: { name: "Time Out Market", description: "Experiencia gastronómica completa" },
  },
  "lisbon.activities.Spettacolo di Fado": {
    en: { name: "Fado show", description: "Dinner with traditional music" },
    es: { name: "Espectáculo de fado", description: "Cena con música tradicional" },
  },
  "lisbon.activities.LX Factory": {
    en: { name: "LX Factory", description: "Creative district with bar and shop" },
    es: { name: "LX Factory", description: "Distrito creativo con bar y tienda" },
  },
  "palma-de-mallorca.restaurants.Marc Fosh": {
    en: { description: "Stella Michelin, creative Mediterranean cuisine" },
    es: { description: "Stella Michelin, cocina mediterránea creativa" },
  },
  "palma-de-mallorca.restaurants.Ca'n Eduardo": {
    en: { description: "Fresh fish at the port since 1943" },
    es: { description: "Pescado fresco en el puerto desde 1943" },
  },
  "palma-de-mallorca.restaurants.Tast Club": {
    en: { description: "Creative Tapas in the Old Town" },
    es: { description: "Tapas creativas en el casco antiguo" },
  },
  "palma-de-mallorca.restaurants.Forn de Sant Joan": {
    en: { description: "Mallorquina cuisine in 4 rooms" },
    es: { description: "Cocina Mallorquina en 4 habitaciones" },
  },
  "palma-de-mallorca.restaurants.La Bóveda": {
    en: { description: "Traditional tapas in the center" },
    es: { description: "Tapas tradicionales en el centro" },
  },
  "palma-de-mallorca.restaurants.Quadrat": {
    en: { description: "Fine dining in Sant Francesc Hotel" },
    es: { description: "Fino comedor en Sant Francesc Hotel" },
  },
  "palma-de-mallorca.restaurants.Adrián Quetglas": {
    en: { description: "Stella Michelin, modern Spanish cuisine" },
    es: { description: "Stella Michelin, cocina española moderna" },
  },
  "palma-de-mallorca.restaurants.Sumailla": {
    en: { description: "Japanese-Peruvian Sushi" },
    es: { description: "Sushi japonés-peruano" },
  },
  "palma-de-mallorca.restaurants.Sa Pernera": {
    en: { description: "Authentic Mallorquine Cuisine" },
    es: { description: "Authentic Mallorquine Cuisine" },
  },
  "palma-de-mallorca.restaurants.Bar España": {
    en: { description: "Random Tapas very frequented by locals" },
    es: { description: "Tapas aleatorias muy frecuentadas por los locales" },
  },
  "palma-de-mallorca.bars.Brassclub": {
    en: { description: "Cocktail bar award-winning" },
    es: { description: "Cocktail bar galardonado" },
  },
  "palma-de-mallorca.bars.Hotel Cuba Roof Bar": {
    en: { description: "Rooftop with Cathedral View" },
    es: { description: "Encimera con vista Catedral" },
  },
  "palma-de-mallorca.bars.Bar Abaco": {
    en: { description: "Surreal cocktail bar in 17th century palace" },
    es: { description: "Bar de cócteles surrealistas en el palacio del siglo XVII" },
  },
  "palma-de-mallorca.bars.Hotel Saratoga Sky Bar": {
    en: { description: "Swimming pool and cocktail on roofs" },
    es: { description: "Piscina y cóctel en los techos" },
  },
  "palma-de-mallorca.bars.Atlántico": {
    en: { description: "Historic bar in Sa Llotja" },
    es: { description: "Histórico bar en Sa Llotja" },
  },
  "palma-de-mallorca.bars.Café La Lonja": {
    en: { description: "Iconic bar in Lonja square" },
    es: { description: "Iconic bar en plaza Lonja" },
  },
  "palma-de-mallorca.bars.Gibson Bar": {
    en: { description: "Modern cocktail bar in Plaça Mercat" },
    es: { description: "Bar de cócteles moderno en Plaça Mercat" },
  },
  "palma-de-mallorca.bars.Idem": {
    en: { description: "Cocktail trendy bar" },
    es: { description: "Cocktail trendy bar" },
  },
  "palma-de-mallorca.bars.Lab Cocktail": {
    en: { description: "Mixology in the historical centre" },
    es: { description: "Mezcla en el centro histórico" },
  },
  "palma-de-mallorca.bars.Bar Flexas": {
    en: { description: "Bohemian atmosphere and art" },
    es: { description: "Ambiente bohemio y arte" },
  },
  "palma-de-mallorca.nightlife.Tito's Mallorca": {
    en: { description: "Historical disco with view of the port" },
    es: { description: "Disco histórico con vista al puerto" },
  },
  "palma-de-mallorca.nightlife.Pacha Mallorca": {
    en: { description: "iconic brand also in Palma" },
    es: { description: "icónica marca también en Palma" },
  },
  "palma-de-mallorca.nightlife.BCM Planet Dance": {
    en: { description: "Mega club in Magaluf" },
    es: { description: "Mega club en Magaluf" },
  },
  "palma-de-mallorca.nightlife.Garito Café": {
    en: { description: "Club with resident DJ level" },
    es: { description: "Club con nivel DJ residente" },
  },
  "palma-de-mallorca.nightlife.Social Club": {
    en: { description: "Elegant disco in the centre" },
    es: { description: "Elegante discoteca en el centro" },
  },
  "palma-de-mallorca.nightlife.Mood Beach Club": {
    en: { description: "Beach club south of the island" },
    es: { description: "Club de playa al sur de la isla" },
  },
  "palma-de-mallorca.nightlife.Ocean Beach Mallorca": {
    en: { description: "Pool party in style Ibiza" },
    es: { description: "Fiesta de piscina en estilo Ibiza" },
  },
  "palma-de-mallorca.nightlife.Megapark": {
    en: { description: "Mega disco in Playa de Palma" },
    es: { description: "Mega disco en Playa de Palma" },
  },
  "palma-de-mallorca.nightlife.Bierkönig": {
    en: { description: "German locality in Playa de Palma" },
    es: { description: "Localidad alemana en Playa de Palma" },
  },
  "palma-de-mallorca.nightlife.Aquarium Reef": {
    en: { description: "Club in Magaluf with great track" },
    es: { description: "Club en Magaluf con gran pista" },
  },
  "palma-de-mallorca.activities.Cattedrale La Seu": {
    en: { name: "Cathedral La Seu", description: "Gothic masterpiece by the sea" },
    es: { name: "Catedral de La Seu", description: "Obra maestra gótica junto al mar" },
  },
  "palma-de-mallorca.activities.Castello di Bellver": {
    en: { name: "Bellver Castle", description: "A circular castle unique in Europe" },
    es: { name: "Castillo de Bellver", description: "Castillo circular único en Europa" },
  },
  "palma-de-mallorca.activities.Caves of Drach": {
    en: { name: "Caves of Drach", description: "Underground caves with concert" },
    es: { name: "Cuevas de Drach", description: "Cuevas subterráneas con concierto" },
  },
  "palma-de-mallorca.activities.Treno di Soller": {
    en: { name: "Sóller train", description: "Historic train between mountains and sea" },
    es: { name: "Tren de Sóller", description: "Tren histórico entre montañas y mar" },
  },
  "palma-de-mallorca.activities.Tour in barca": {
    en: { name: "Boat tour", description: "Hidden coves along the south coast" },
    es: { name: "Tour en barco", description: "Calas escondidas de la costa sur" },
  },
  "palma-de-mallorca.activities.Quad tour nella sierra": {
    en: { name: "Quad tour in the sierra", description: "Off-road adventure in Tramuntana" },
    es: { name: "Tour en quad por la sierra", description: "Aventura todoterreno en la Tramuntana" },
  },
  "palma-de-mallorca.activities.Cala Mondragó": {
    en: { name: "Cala Mondragó", description: "Paradise beach in the natural park" },
    es: { name: "Cala Mondragó", description: "Playa paradisíaca en el parque natural" },
  },
  "palma-de-mallorca.activities.Es Trenc": {
    en: { name: "Es Trenc", description: "Caribbean beach in Majorca" },
    es: { name: "Es Trenc", description: "Playa del Caribe en Mallorca" },
  },
  "palma-de-mallorca.activities.Valldemossa": {
    en: { name: "Valldemossa", description: "Village where Chopin lived" },
    es: { name: "Valldemossa", description: "Pueblo donde vivía Chopin" },
  },
  "palma-de-mallorca.activities.Magaluf boat party": {
    en: { name: "Magaluf boat party", description: "Boat party with DJ" },
    es: { name: "Fiesta de barco de Magaluf", description: "Fiesta del barco con DJ" },
  },
};

export function getLocalizedExperienceCopy(
  cityKey: string,
  category: string,
  itemName: string,
  locale: ExperienceLocale,
): { name?: string; description?: string } {
  if (locale === "it") return {};
  return LOCALIZED_EXPERIENCE_COPY[`${cityKey}.${category}.${itemName}`]?.[locale] ?? {};
}

export const LOCALIZED_EXPERIENCE_COPY_COUNT = Object.keys(LOCALIZED_EXPERIENCE_COPY).length;
