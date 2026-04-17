/**
 * freightMarkets.ts
 * Maps city/state strings and metro aliases to canonical freight market keys.
 * Used by the lane suggestion service to resolve a driver's current location
 * to a known origin market for outbound lane planning.
 *
 * No AI. No external services. Fully deterministic, local resolution.
 */

export type MarketKey =
  | 'okc' | 'dfw' | 'houston' | 'chicago' | 'atlanta'
  | 'kansas_city' | 'memphis' | 'nashville' | 'charlotte'
  | 'jacksonville' | 'columbus' | 'indianapolis' | 'st_louis'
  | 'denver' | 'phoenix' | 'los_angeles' | 'las_vegas'
  | 'salt_lake' | 'seattle' | 'portland' | 'minneapolis'
  | 'detroit' | 'cleveland' | 'cincinnati' | 'louisville'
  | 'new_york' | 'philadelphia' | 'miami' | 'tampa'
  | 'new_orleans' | 'el_paso' | 'san_antonio' | 'albuquerque'
  | 'omaha' | 'des_moines'

export interface FreightMarket {
  key: MarketKey
  label: string       // "Dallas, TX"
  state: string       // "TX"
  aliases: string[]   // lowercase city names/phrases that resolve here
}

export const FREIGHT_MARKETS: FreightMarket[] = [
  {
    key: 'okc', label: 'Oklahoma City, OK', state: 'OK',
    aliases: ['oklahoma city', 'okc', 'edmond', 'norman', 'moore', 'yukon', 'midwest city', 'del city', 'mustang', 'bethany ok', 'stillwater'],
  },
  {
    key: 'dfw', label: 'Dallas, TX', state: 'TX',
    aliases: ['dallas', 'fort worth', 'dfw', 'arlington', 'irving', 'plano', 'garland', 'frisco', 'mckinney', 'grand prairie', 'mesquite', 'carrollton', 'richardson', 'lewisville', 'euless', 'bedford', 'hurst', 'grapevine', 'denton'],
  },
  {
    key: 'houston', label: 'Houston, TX', state: 'TX',
    aliases: ['houston', 'pasadena', 'sugar land', 'pearland', 'katy', 'baytown', 'spring', 'humble', 'conroe', 'the woodlands', 'beaumont', 'galveston', 'texas city', 'la marque'],
  },
  {
    key: 'chicago', label: 'Chicago, IL', state: 'IL',
    aliases: ['chicago', 'joliet', 'aurora', 'rockford', 'elgin', 'naperville', 'waukegan', 'cicero', 'gary', 'hammond', 'schaumburg', 'evanston', 'palatine', 'oak park', 'bolingbrook', 'tinley park', 'orland park'],
  },
  {
    key: 'atlanta', label: 'Atlanta, GA', state: 'GA',
    aliases: ['atlanta', 'marietta', 'sandy springs', 'roswell', 'johns creek', 'alpharetta', 'smyrna', 'peachtree city', 'macon', 'savannah', 'augusta', 'griffin', 'newnan', 'gainesville ga', 'douglasville'],
  },
  {
    key: 'kansas_city', label: 'Kansas City, MO', state: 'MO',
    aliases: ['kansas city', 'independence', 'lees summit', "lee's summit", 'olathe', 'overland park', 'shawnee', 'topeka', 'lawrence ks', 'lenexa', 'belton', 'raytown'],
  },
  {
    key: 'memphis', label: 'Memphis, TN', state: 'TN',
    aliases: ['memphis', 'germantown', 'bartlett', 'collierville', 'olive branch', 'southaven', 'horn lake', 'west memphis', 'jackson tn'],
  },
  {
    key: 'nashville', label: 'Nashville, TN', state: 'TN',
    aliases: ['nashville', 'murfreesboro', 'franklin', 'clarksville', 'hendersonville', 'brentwood', 'smyrna tn', 'gallatin', 'la vergne', 'columbia tn', 'cookeville', 'knoxville', 'chattanooga'],
  },
  {
    key: 'charlotte', label: 'Charlotte, NC', state: 'NC',
    aliases: ['charlotte', 'concord', 'gastonia', 'durham', 'raleigh', 'greensboro', 'winston-salem', 'winston salem', 'high point', 'fayetteville nc', 'cary', 'huntersville', 'matthews', 'salisbury nc'],
  },
  {
    key: 'jacksonville', label: 'Jacksonville, FL', state: 'FL',
    aliases: ['jacksonville', 'orange park', 'st augustine', 'saint augustine', 'ponte vedra', 'fernandina beach', 'palatka', 'daytona beach'],
  },
  {
    key: 'columbus', label: 'Columbus, OH', state: 'OH',
    aliases: ['columbus', 'westerville', 'dublin oh', 'grove city', 'hilliard', 'reynoldsburg', 'gahanna', 'upper arlington', 'pickerington', 'newark oh', 'zanesville'],
  },
  {
    key: 'indianapolis', label: 'Indianapolis, IN', state: 'IN',
    aliases: ['indianapolis', 'carmel', 'fishers', 'anderson', 'muncie', 'terre haute', 'bloomington in', 'greenwood', 'noblesville', 'fort wayne', 'south bend', 'evansville'],
  },
  {
    key: 'st_louis', label: 'St. Louis, MO', state: 'MO',
    aliases: ['st. louis', 'st louis', 'saint louis', "o'fallon mo", 'ofallon mo', 'belleville il', 'chesterfield', 'florissant', 'maryland heights', 'hazelwood', 'st charles', 'springfield mo'],
  },
  {
    key: 'denver', label: 'Denver, CO', state: 'CO',
    aliases: ['denver', 'aurora co', 'lakewood', 'arvada', 'westminster', 'thornton', 'pueblo', 'fort collins', 'boulder', 'greeley', 'loveland', 'longmont', 'colorado springs'],
  },
  {
    key: 'phoenix', label: 'Phoenix, AZ', state: 'AZ',
    aliases: ['phoenix', 'mesa', 'chandler', 'scottsdale', 'glendale az', 'tempe', 'gilbert', 'peoria az', 'surprise', 'yuma', 'tucson', 'flagstaff', 'prescott', 'lake havasu'],
  },
  {
    key: 'los_angeles', label: 'Los Angeles, CA', state: 'CA',
    aliases: ['los angeles', 'long beach', 'anaheim', 'santa ana', 'riverside', 'ontario ca', 'san bernardino', 'garden grove', 'inglewood', 'pomona', 'torrance', 'pasadena', 'orange', 'fullerton', 'thousand oaks', 'oxnard', 'bakersfield', 'barstow', 'fontana', 'rialto', 'el monte', 'compton', 'san diego', 'chula vista', 'escondido'],
  },
  {
    key: 'las_vegas', label: 'Las Vegas, NV', state: 'NV',
    aliases: ['las vegas', 'henderson nv', 'north las vegas', 'reno', 'sparks', 'henderson', 'boulder city'],
  },
  {
    key: 'salt_lake', label: 'Salt Lake City, UT', state: 'UT',
    aliases: ['salt lake city', 'salt lake', 'west valley city', 'provo', 'west jordan', 'orem', 'sandy ut', 'ogden', 'layton', 'taylorsville'],
  },
  {
    key: 'seattle', label: 'Seattle, WA', state: 'WA',
    aliases: ['seattle', 'tacoma', 'bellevue', 'kent', 'everett', 'renton', 'kirkland', 'redmond', 'spokane', 'yakima'],
  },
  {
    key: 'portland', label: 'Portland, OR', state: 'OR',
    aliases: ['portland', 'gresham', 'beaverton', 'hillsboro', 'eugene', 'salem', 'medford', 'bend', 'boise', 'meridian id', 'nampa'],
  },
  {
    key: 'minneapolis', label: 'Minneapolis, MN', state: 'MN',
    aliases: ['minneapolis', 'st. paul', 'saint paul', 'bloomington mn', 'rochester mn', 'duluth', 'brooklyn park', 'plymouth mn', 'maple grove', 'eagan', 'fargo', 'sioux falls'],
  },
  {
    key: 'detroit', label: 'Detroit, MI', state: 'MI',
    aliases: ['detroit', 'warren', 'sterling heights', 'ann arbor', 'lansing', 'flint', 'grand rapids', 'kalamazoo', 'pontiac', 'dearborn', 'livonia', 'westland', 'toledo'],
  },
  {
    key: 'cleveland', label: 'Cleveland, OH', state: 'OH',
    aliases: ['cleveland', 'akron', 'canton', 'youngstown', 'parma', 'lorain', 'elyria', 'mentor', 'euclid', 'dayton', 'lima oh'],
  },
  {
    key: 'cincinnati', label: 'Cincinnati, OH', state: 'OH',
    aliases: ['cincinnati', 'covington ky', 'newport ky', 'florence ky', 'fairfield oh', 'mason oh', 'middletown oh', 'hamilton oh', 'west chester'],
  },
  {
    key: 'louisville', label: 'Louisville, KY', state: 'KY',
    aliases: ['louisville', 'lexington', 'bowling green', 'owensboro', 'frankfort', 'elizabethtown', 'jeffersonville', 'new albany in'],
  },
  {
    key: 'new_york', label: 'New York, NY', state: 'NY',
    aliases: ['new york', 'newark nj', 'jersey city', 'yonkers', 'brooklyn', 'bronx', 'queens', 'elizabeth nj', 'paterson', 'albany', 'buffalo'],
  },
  {
    key: 'philadelphia', label: 'Philadelphia, PA', state: 'PA',
    aliases: ['philadelphia', 'camden nj', 'wilmington de', 'trenton nj', 'allentown', 'reading pa', 'harrisburg', 'lancaster pa', 'chester pa', 'pittsburgh'],
  },
  {
    key: 'miami', label: 'Miami, FL', state: 'FL',
    aliases: ['miami', 'fort lauderdale', 'boca raton', 'west palm beach', 'pembroke pines', 'hollywood fl', 'miramar', 'coral springs', 'pompano beach', 'deerfield beach', 'hialeah'],
  },
  {
    key: 'tampa', label: 'Tampa, FL', state: 'FL',
    aliases: ['tampa', 'st. petersburg', 'clearwater', 'brandon', 'lakeland', 'orlando', 'kissimmee', 'ocala', 'gainesville fl', 'sarasota', 'cape coral', 'fort myers'],
  },
  {
    key: 'new_orleans', label: 'New Orleans, LA', state: 'LA',
    aliases: ['new orleans', 'metairie', 'baton rouge', 'shreveport', 'lafayette la', 'lake charles', 'kenner', 'marrero', 'harvey la', 'slidell'],
  },
  {
    key: 'el_paso', label: 'El Paso, TX', state: 'TX',
    aliases: ['el paso', 'las cruces', 'ciudad juarez', 'juarez', 'sunland park'],
  },
  {
    key: 'san_antonio', label: 'San Antonio, TX', state: 'TX',
    aliases: ['san antonio', 'austin', 'round rock', 'cedar park', 'new braunfels', 'san marcos', 'laredo', 'corpus christi', 'killeen', 'waco', 'midland', 'odessa', 'lubbock', 'abilene', 'amarillo'],
  },
  {
    key: 'albuquerque', label: 'Albuquerque, NM', state: 'NM',
    aliases: ['albuquerque', 'santa fe', 'rio rancho', 'las cruces nm', 'roswell nm', 'farmington nm'],
  },
  {
    key: 'omaha', label: 'Omaha, NE', state: 'NE',
    aliases: ['omaha', 'council bluffs', 'lincoln ne', 'bellevue ne', 'grand island', 'kearney ne'],
  },
  {
    key: 'des_moines', label: 'Des Moines, IA', state: 'IA',
    aliases: ['des moines', 'cedar rapids', 'iowa city', 'sioux city', 'davenport', 'waterloo ia'],
  },
]

// ─── Lookup index ────────────────────────────────────────────────────────────

const ALIAS_MAP = new Map<string, MarketKey>()
for (const m of FREIGHT_MARKETS) {
  ALIAS_MAP.set(m.key, m.key)
  ALIAS_MAP.set(m.label.toLowerCase(), m.key)
  for (const alias of m.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), m.key)
  }
}

// State → primary market fallback
const STATE_PRIMARY: Record<string, MarketKey> = {
  TX: 'dfw',   IL: 'chicago',    GA: 'atlanta',  MO: 'st_louis',
  TN: 'nashville', NC: 'charlotte', FL: 'tampa',  OH: 'columbus',
  IN: 'indianapolis', CO: 'denver',  AZ: 'phoenix', CA: 'los_angeles',
  NV: 'las_vegas', WA: 'seattle',   OR: 'portland', MN: 'minneapolis',
  MI: 'detroit',  KY: 'louisville', NY: 'new_york', PA: 'philadelphia',
  LA: 'new_orleans', NM: 'albuquerque', NE: 'omaha', IA: 'des_moines',
  OK: 'okc',    KS: 'kansas_city',  UT: 'salt_lake',
}

/**
 * Resolve a free-form location string to a market key.
 * Handles "City, ST", "City ST", or plain city names.
 * Returns null if no market can be matched.
 */
export function resolveMarket(location: string | null | undefined): MarketKey | null {
  if (!location) return null
  const raw = location.trim().toLowerCase()

  // Full string match
  if (ALIAS_MAP.has(raw)) return ALIAS_MAP.get(raw)!

  // Split on comma: "Dallas, TX"
  const parts = raw.split(',').map(p => p.trim())
  const city = parts[0]
  const stateRaw = parts[1]?.trim()
  const stateUpper = stateRaw?.toUpperCase()

  if (ALIAS_MAP.has(city)) return ALIAS_MAP.get(city)!

  // "city st" combined
  if (stateRaw) {
    const combo = `${city} ${stateRaw}`
    if (ALIAS_MAP.has(combo)) return ALIAS_MAP.get(combo)!
  }

  // First word of city (e.g. "Kansas" → kansas_city via alias)
  const firstWord = city.split(' ')[0]
  if (firstWord.length > 3 && ALIAS_MAP.has(firstWord)) return ALIAS_MAP.get(firstWord)!

  // State fallback
  if (stateUpper && STATE_PRIMARY[stateUpper]) return STATE_PRIMARY[stateUpper]

  return null
}

export function getMarket(key: MarketKey): FreightMarket | undefined {
  return FREIGHT_MARKETS.find(m => m.key === key)
}
