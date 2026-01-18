// Unified city → IATA code mapping
// All cities can be used as both origins and destinations
// Organized by country for easy maintenance

export const CITY_TO_IATA: Record<string, string> = {
  // ===== ITALY =====
  "roma": "ROM",
  "rome": "ROM",
  "fiumicino": "FCO",  // Rome Fiumicino airport
  "ciampino": "CIA",   // Rome Ciampino airport
  "milano": "MIL",
  "milan": "MIL",
  "malpensa": "MXP",   // Milan Malpensa airport
  "linate": "LIN",     // Milan Linate airport
  "bergamo": "BGY",    // Milan Bergamo/Orio al Serio
  "orio al serio": "BGY",
  "napoli": "NAP",
  "naples": "NAP",
  "torino": "TRN",
  "turin": "TRN",
  "venezia": "VCE",
  "venice": "VCE",
  "bologna": "BLQ",
  "firenze": "FLR",
  "florence": "FLR",
  "bari": "BRI",
  "catania": "CTA",
  "palermo": "PMO",
  "verona": "VRN",
  "pisa": "PSA",
  "genova": "GOA",
  "genoa": "GOA",
  "brindisi": "BDS",
  "olbia": "OLB",
  "cagliari": "CAG",
  "alghero": "AHO",

  // ===== SPAIN =====
  "madrid": "MAD",
  "barcellona": "BCN",
  "barcelona": "BCN",
  "ibiza": "IBZ",
  "palma de mallorca": "PMI",
  "palma": "PMI",
  "mallorca": "PMI",
  "valencia": "VLC",
  "siviglia": "SVQ",
  "seville": "SVQ",
  "malaga": "AGP",
  "bilbao": "BIO",
  "alicante": "ALC",
  "tenerife": "TFS",
  "gran canaria": "LPA",
  "las palmas": "LPA",

  // ===== FRANCE =====
  "parigi": "PAR",
  "paris": "PAR",
  "nizza": "NCE",
  "nice": "NCE",
  "lione": "LYS",
  "lyon": "LYS",
  "marsiglia": "MRS",
  "marseille": "MRS",
  "tolosa": "TLS",
  "toulouse": "TLS",
  "bordeaux": "BOD",
  "nantes": "NTE",
  "strasburgo": "SXB",
  "strasbourg": "SXB",

  // ===== GERMANY =====
  "berlino": "BER",
  "berlin": "BER",
  "monaco di baviera": "MUC",
  "munich": "MUC",
  "munchen": "MUC",
  "francoforte": "FRA",
  "frankfurt": "FRA",
  "amburgo": "HAM",
  "hamburg": "HAM",
  "dusseldorf": "DUS",
  "düsseldorf": "DUS",
  "colonia": "CGN",
  "cologne": "CGN",
  "koln": "CGN",
  "stoccarda": "STR",
  "stuttgart": "STR",
  "hannover": "HAJ",
  "hanover": "HAJ",
  "norimberga": "NUE",
  "nuremberg": "NUE",

  // ===== UNITED KINGDOM =====
  "londra": "LON",
  "london": "LON",
  "manchester": "MAN",
  "birmingham": "BHX",
  "edimburgo": "EDI",
  "edinburgh": "EDI",
  "glasgow": "GLA",
  "bristol": "BRS",
  "liverpool": "LPL",
  "newcastle": "NCL",
  "belfast": "BFS",
  "leeds": "LBA",

  // ===== NETHERLANDS =====
  "amsterdam": "AMS",
  "rotterdam": "RTM",
  "eindhoven": "EIN",

  // ===== BELGIUM =====
  "bruxelles": "BRU",
  "brussels": "BRU",
  "anversa": "ANR",
  "antwerp": "ANR",

  // ===== PORTUGAL =====
  "lisbona": "LIS",
  "lisbon": "LIS",
  "lisboa": "LIS",
  "porto": "OPO",
  "faro": "FAO",

  // ===== POLAND =====
  "varsavia": "WAW",
  "warsaw": "WAW",
  "cracovia": "KRK",
  "krakow": "KRK",
  "cracow": "KRK",
  "danzica": "GDN",
  "gdansk": "GDN",
  "breslavia": "WRO",
  "wroclaw": "WRO",
  "poznan": "POZ",

  // ===== CZECH REPUBLIC =====
  "praga": "PRG",
  "prague": "PRG",
  "brno": "BRQ",

  // ===== HUNGARY =====
  "budapest": "BUD",

  // ===== AUSTRIA =====
  "vienna": "VIE",
  "wien": "VIE",
  "salisburgo": "SZG",
  "salzburg": "SZG",
  "innsbruck": "INN",

  // ===== SWITZERLAND =====
  "zurigo": "ZRH",
  "zurich": "ZRH",
  "zürich": "ZRH",
  "ginevra": "GVA",
  "geneva": "GVA",
  "basilea": "BSL",
  "basel": "BSL",

  // ===== IRELAND =====
  "dublino": "DUB",
  "dublin": "DUB",
  "cork": "ORK",

  // ===== SCANDINAVIA =====
  "copenaghen": "CPH",
  "copenhagen": "CPH",
  "stoccolma": "ARN",
  "stockholm": "ARN",
  "oslo": "OSL",
  "helsinki": "HEL",
  "goteborg": "GOT",
  "gothenburg": "GOT",
  "malmo": "MMX",

  // ===== GREECE =====
  "atene": "ATH",
  "athens": "ATH",
  "salonicco": "SKG",
  "thessaloniki": "SKG",
  "santorini": "JTR",
  "mykonos": "JMK",
  "creta": "HER",
  "crete": "HER",
  "heraklion": "HER",
  "rodi": "RHO",
  "rhodes": "RHO",
  "corfù": "CFU",
  "corfu": "CFU",

  // ===== CROATIA =====
  "zagabria": "ZAG",
  "zagreb": "ZAG",
  "spalato": "SPU",
  "split": "SPU",
  "dubrovnik": "DBV",

  // ===== OTHER EUROPEAN =====
  "bucarest": "OTP",
  "bucharest": "OTP",
  "sofia": "SOF",
  "belgrado": "BEG",
  "belgrade": "BEG",
  "lubiana": "LJU",
  "ljubljana": "LJU",
  "bratislava": "BTS",
  "tallin": "TLL",
  "tallinn": "TLL",
  "riga": "RIX",
  "vilnius": "VNO",
  "malta": "MLA",
  "la valletta": "MLA",
  "valletta": "MLA",
  "reykjavik": "KEF",
  "cipro": "LCA",
  "cyprus": "LCA",
  "larnaca": "LCA"
};

// IATA → city name mapping (for display purposes)
export const IATA_TO_CITY: Record<string, string> = {
  // Italy
  "ROM": "Roma",
  "FCO": "Roma Fiumicino",
  "CIA": "Roma Ciampino",
  "MIL": "Milano",
  "MXP": "Milano Malpensa",
  "LIN": "Milano Linate",
  "BGY": "Bergamo",
  "NAP": "Napoli",
  "TRN": "Torino",
  "VCE": "Venezia",
  "BLQ": "Bologna",
  "FLR": "Firenze",
  "BRI": "Bari",
  "CTA": "Catania",
  "PMO": "Palermo",
  "VRN": "Verona",
  "PSA": "Pisa",
  "GOA": "Genova",
  "BDS": "Brindisi",
  "OLB": "Olbia",
  "CAG": "Cagliari",
  "AHO": "Alghero",

  // Spain
  "MAD": "Madrid",
  "BCN": "Barcelona",
  "IBZ": "Ibiza",
  "PMI": "Palma de Mallorca",
  "VLC": "Valencia",
  "SVQ": "Seville",
  "AGP": "Malaga",
  "BIO": "Bilbao",
  "ALC": "Alicante",
  "TFS": "Tenerife",
  "LPA": "Gran Canaria",

  // France
  "PAR": "Paris",
  "NCE": "Nice",
  "LYS": "Lyon",
  "MRS": "Marseille",
  "TLS": "Toulouse",
  "BOD": "Bordeaux",
  "NTE": "Nantes",
  "SXB": "Strasbourg",

  // Germany
  "BER": "Berlin",
  "MUC": "Munich",
  "FRA": "Frankfurt",
  "HAM": "Hamburg",
  "DUS": "Düsseldorf",
  "CGN": "Cologne",
  "STR": "Stuttgart",
  "HAJ": "Hanover",
  "NUE": "Nuremberg",

  // United Kingdom
  "LON": "London",
  "MAN": "Manchester",
  "BHX": "Birmingham",
  "EDI": "Edinburgh",
  "GLA": "Glasgow",
  "BRS": "Bristol",
  "LPL": "Liverpool",
  "NCL": "Newcastle",
  "BFS": "Belfast",
  "LBA": "Leeds",

  // Netherlands
  "AMS": "Amsterdam",
  "RTM": "Rotterdam",
  "EIN": "Eindhoven",

  // Belgium
  "BRU": "Brussels",
  "ANR": "Antwerp",

  // Portugal
  "LIS": "Lisbon",
  "OPO": "Porto",
  "FAO": "Faro",

  // Poland
  "WAW": "Warsaw",
  "KRK": "Krakow",
  "GDN": "Gdansk",
  "WRO": "Wroclaw",
  "POZ": "Poznan",

  // Czech Republic
  "PRG": "Prague",
  "BRQ": "Brno",

  // Hungary
  "BUD": "Budapest",

  // Austria
  "VIE": "Vienna",
  "SZG": "Salzburg",
  "INN": "Innsbruck",

  // Switzerland
  "ZRH": "Zurich",
  "GVA": "Geneva",
  "BSL": "Basel",

  // Ireland
  "DUB": "Dublin",
  "ORK": "Cork",

  // Scandinavia
  "CPH": "Copenhagen",
  "ARN": "Stockholm",
  "OSL": "Oslo",
  "HEL": "Helsinki",
  "GOT": "Gothenburg",
  "MMX": "Malmo",

  // Greece
  "ATH": "Athens",
  "SKG": "Thessaloniki",
  "JTR": "Santorini",
  "JMK": "Mykonos",
  "HER": "Heraklion",
  "RHO": "Rhodes",
  "CFU": "Corfu",

  // Croatia
  "ZAG": "Zagreb",
  "SPU": "Split",
  "DBV": "Dubrovnik",

  // Other European
  "OTP": "Bucharest",
  "SOF": "Sofia",
  "BEG": "Belgrade",
  "LJU": "Ljubljana",
  "BTS": "Bratislava",
  "TLL": "Tallinn",
  "RIX": "Riga",
  "VNO": "Vilnius",
  "MLA": "Malta",
  "KEF": "Reykjavik",
  "LCA": "Larnaca"
};

export function cityToIata(cityName: string | undefined | null): string | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_IATA[normalized] || null;
}

export function iataToCity(iataCode: string | undefined | null): string {
  if (!iataCode) return "Unknown";
  return IATA_TO_CITY[iataCode.toUpperCase()] || iataCode;
}

// Get list of all available cities for autocomplete/dropdown
export function getAllCities(): string[] {
  return Object.values(IATA_TO_CITY).sort();
}

// Get list of all IATA codes
export function getAllIataCodes(): string[] {
  return Object.keys(IATA_TO_CITY);
}
