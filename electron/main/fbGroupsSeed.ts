// =============================================================================
// fbGroupsSeed.ts — Facebook Groups Master List
// =============================================================================
//
// HOW TO USE THIS FILE:
//
//   ADD a group:   Copy any entry below and add it to the FACEBOOK_GROUPS array.
//                  Fill in name, category, and priority. Leave url as null unless
//                  you have the actual Facebook group URL.
//
//   EDIT a group:  Change any field. name must match exactly what Facebook shows.
//
//   REMOVE/INACTIVE: Set active to false. The app will skip it in recommendations
//                  but keep the history. Do not delete rows — mark inactive.
//
//   CATEGORIES:
//     hotshot        — Hotshot trucking focused groups
//     box_truck      — Box truck / cargo van focused
//     owner_operator — Owner-operator community / networking
//     dispatcher     — Dispatcher-focused or dispatcher-seeking groups
//     general_loads  — General load boards and freight groups
//     reefer         — Reefer / temperature-controlled freight
//     mixed          — General trucking / CDL / multiple equipment types
//     other          — Pilot car, equipment sales, off-topic
//
//   PRIORITY:
//     High   — Post here 3-5x per week. High-value audience, good engagement.
//     Medium — Post here 1-2x per week.
//     Low    — Post occasionally. Low signal or small audience.
//
//   AFTER EDITING:
//     Go to Settings > Dev Tools > Seed Missing Items. This re-seeds new groups
//     using INSERT OR IGNORE, so existing data (last_posted_at, notes, performance
//     counters) is never overwritten.
//
// =============================================================================

export type FbGroupCategory =
  | 'hotshot'
  | 'box_truck'
  | 'owner_operator'
  | 'dispatcher'
  | 'general_loads'
  | 'reefer'
  | 'mixed'
  | 'other'

export type FbGroupPriority = 'High' | 'Medium' | 'Low'

export interface FbGroupSeedEntry {
  // The exact group name as shown on Facebook
  name: string
  // Facebook group URL. Leave null — URLs not available in source data.
  // Add the real URL once you find it (e.g. https://www.facebook.com/groups/xxxxxxx).
  url: string | null
  // See category guide above
  category: FbGroupCategory
  // Posting priority: High | Medium | Low
  priority: FbGroupPriority
  // Set to false to stop recommending this group without deleting its history
  active: boolean
  // Optional notes visible in the app (audience notes, engagement history, etc.)
  notes: string | null
}

// =============================================================================
// FACEBOOK GROUPS — sourced from FB Groups.txt (C:\Users\chris\Desktop\FB Groups.txt)
// Last reviewed: 2026-03-16
// Total: 85 unique groups (deduplicated from 92-row export)
// =============================================================================

export const FACEBOOK_GROUPS: FbGroupSeedEntry[] = [

  // ── Box Truck ───────────────────────────────────────────────────────────────
  { name: 'Box Truck / Owner Operators',                                   url: null, category: 'box_truck',      priority: 'High',   active: true,  notes: null },
  { name: 'Box truck and Hotshot loads',                                   url: null, category: 'box_truck',      priority: 'High',   active: true,  notes: null },
  { name: 'Box Truck and Sprinter Vans Beginners',                         url: null, category: 'box_truck',      priority: 'Low',    active: true,  notes: 'Beginner audience, lower conversion' },
  { name: 'Box Truck Carriers United \u2013 24ft\u201328ft | Dispatch & Lease-On', url: null, category: 'box_truck', priority: 'High', active: true,  notes: 'Dispatcher-seeking audience in this group' },
  { name: 'Box Truck Hub',                                                 url: null, category: 'box_truck',      priority: 'Medium', active: true,  notes: null },
  { name: 'Box truck loads',                                               url: null, category: 'box_truck',      priority: 'High',   active: true,  notes: null },
  { name: 'Box Truck Loads And Contracting Opportunities',                 url: null, category: 'box_truck',      priority: 'High',   active: true,  notes: null },
  { name: 'BOX TRUCK LOADS, ALL TRUCK TYPE LOADS. OWNER OPERATOR/CARRIERS, BROKERS', url: null, category: 'box_truck', priority: 'High', active: true, notes: null },
  { name: 'Box Truck Owners',                                              url: null, category: 'box_truck',      priority: 'Medium', active: true,  notes: null },
  { name: 'BOX TRUCK /LOAD HELP',                                         url: null, category: 'box_truck',      priority: 'Medium', active: true,  notes: null },

  // ── Hotshot ──────────────────────────────────────────────────────────────────
  { name: 'Hot-Shot Trucking',                                             url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot & Box Truck Loads \u2014 CDL / Non-CDL',               url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot & Flatbeds \u2013 CDL/Non-CDL',                        url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot & Semi trucking Loads Business Help',                   url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: null },
  { name: 'Hotshot CDL & NON CDL- OWNER Operator',                        url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot CDL and Non CDL Loads',                                 url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot CDL/Non-CDL',                                          url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Haulers: CDL & Non-CDL Trucking',                      url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: null },
  { name: 'Hotshot Loads',                                                 url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot loads & Trucking USA',                                  url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Loads - CDL and Non CDL',                              url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Owner Operators CDL/ NON CDL Business Help',           url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Owner Operators USA',                                   url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Owner-Operators CDL/Non CDL',                          url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Transportation CDL/NON CDL',                           url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Truckers',                                              url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Trucking',                                              url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'HOTSHOT TRUCKING - TEXAS EDITION',                             url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: 'TX-focused audience — good for TX lane availability posts' },
  { name: 'Hotshot Trucking CDL/NON CDL',                                 url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Trucking Group',                                        url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: null },
  { name: 'HOTSHOT USA',                                                   url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'HotShot, Trucks,Trailers,Parts. And Work',                     url: null, category: 'hotshot',        priority: 'Low',    active: true,  notes: 'Mixed buy/sell and work content' },
  { name: 'Hotshot- Owner Operators- Loads- Business Help Trucking',      url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'HOTSHOTS SOUTH TEXAS',                                         url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: 'South TX regional — relevant for TX lanes' },
  { name: 'Florida Hotshot transport',                                     url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: 'FL regional — good for Southeast lane posts' },
  { name: 'Non cdl hotshot for beginners',                                 url: null, category: 'hotshot',        priority: 'Low',    active: true,  notes: 'Beginner audience, some new authority leads' },
  { name: 'Non CDL Hotshot Trucking | Owner Operators and Drivers',       url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Nationwide Hotshot Job Openings',                               url: null, category: 'hotshot',        priority: 'Medium', active: true,  notes: null },
  { name: 'USA Hotshot Trucking Network',                                  url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: null },
  { name: 'Oklahoma hotshots',                                             url: null, category: 'hotshot',        priority: 'High',   active: true,  notes: 'Primary market — OK-based audience. Post frequently.' },

  // ── Dispatcher (groups where drivers look for dispatchers) ───────────────────
  { name: 'dispatcher_usa',                                                url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },
  { name: 'Dispatchers, LoadBoards, Freight Brokers, Owner Operators',    url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },
  { name: 'Hotshot Truck Dispatchers & Lease On Authority',               url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: 'Strong audience actively seeking dispatch' },
  { name: 'Non-CDL HOTSHOT-Owner Operators, Dispatchers',                 url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },
  { name: 'OWNER OPERATORS LOOKING FOR DISPATCHER',                       url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: 'HIGH VALUE — these drivers are actively looking. Check daily.' },
  { name: 'Truck Dispatcher',                                              url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },
  { name: 'Truckers, Dispatchers and Brokers, CDL',                       url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },
  { name: 'USA Truckers & Dispatchers',                                    url: null, category: 'dispatcher',     priority: 'High',   active: true,  notes: null },

  // ── Owner Operator ───────────────────────────────────────────────────────────
  { name: 'New Owner Operators',                                           url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: 'New authorities — high intent for dispatch services' },
  { name: 'NOOA/Owner Operators/No Authority/New Authority',               url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: 'New authority audience — great for new authority tip posts' },
  { name: 'Owner operator network',                                        url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'Owner operator/ CDL driver/Network/new authority/Box truck owners/', url: null, category: 'owner_operator', priority: 'High', active: true, notes: null },
  { name: 'OWNER OPERATORS',                                               url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'Owner Operators & Partners',                                    url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'Owner Operators & Truck Drivers Society',                       url: null, category: 'owner_operator', priority: 'Medium', active: true,  notes: null },
  { name: 'Owner Operators and Truck Drivers',                             url: null, category: 'owner_operator', priority: 'Medium', active: true,  notes: null },
  { name: 'Owner Operators Looking for Loads',                             url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'OWNER OPERATORS NETWORK',                                       url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'Owner Operators, Brokers, Dispatchers, CDL jobs',              url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: null },
  { name: 'Owner-operators looking for work',                              url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: 'Drivers actively looking — high conversion potential' },
  { name: 'Texas CDL Drivers, Owner Operators, Fleet Owners',             url: null, category: 'owner_operator', priority: 'High',   active: true,  notes: 'TX-based OOs — primary lane market' },
  { name: 'Truck Owner Operators Network Association',                     url: null, category: 'owner_operator', priority: 'Medium', active: true,  notes: null },

  // ── General Loads ────────────────────────────────────────────────────────────
  { name: 'Amazon Relay Partners - Transportation, Trucking, Logistics + Brokerage', url: null, category: 'general_loads', priority: 'Low', active: true, notes: 'Amazon-focused — lower relevance for OO dispatch' },
  { name: 'CDL and Non CDL trucks loads',                                  url: null, category: 'general_loads',  priority: 'Medium', active: true,  notes: null },
  { name: 'Load Board...Oversize & Heavy Haul Only!',                     url: null, category: 'general_loads',  priority: 'Low',    active: true,  notes: 'Oversize niche — lower relevance' },
  { name: 'Load Boards, Dispatchers, Freight Brokers, Owner Operators',   url: null, category: 'general_loads',  priority: 'High',   active: true,  notes: null },
  { name: 'TRUCK CONTRACTS AND LOADS',                                     url: null, category: 'general_loads',  priority: 'High',   active: true,  notes: null },
  { name: 'Truck Load Board',                                              url: null, category: 'general_loads',  priority: 'Medium', active: true,  notes: null },
  { name: 'Trucking Jobs, Dispatchers, Load Boards and Hauling Services', url: null, category: 'general_loads',  priority: 'High',   active: true,  notes: null },
  { name: 'Trucking Load Board -Reefers/Dry Vans/Flatbeds/PO/Hotshots',  url: null, category: 'general_loads',  priority: 'High',   active: true,  notes: null },
  { name: 'US Freight Broker, Owner Operators, Carriers, Shippers, Dispatchers Network', url: null, category: 'general_loads', priority: 'High', active: true, notes: null },
  { name: 'USA Trucking Network| Owner Operators|Carriers',               url: null, category: 'general_loads',  priority: 'High',   active: true,  notes: null },

  // ── Reefer ───────────────────────────────────────────────────────────────────
  { name: 'Reefer Load Board & Truck Availability North America',         url: null, category: 'reefer',          priority: 'High',   active: true,  notes: null },
  { name: 'Reefer/Dryvans Loads USA',                                      url: null, category: 'reefer',          priority: 'High',   active: true,  notes: null },

  // ── Mixed / General Trucking ─────────────────────────────────────────────────
  { name: 'CDL JOBS',                                                      url: null, category: 'mixed',           priority: 'Low',    active: true,  notes: 'Job posting audience — low dispatch intent' },
  { name: 'OKC Truck Drivers - CDL and Non CDL',                         url: null, category: 'mixed',           priority: 'High',   active: true,  notes: 'Oklahoma City audience — primary market' },
  { name: 'Oklahoma Trucking Jobs',                                        url: null, category: 'mixed',           priority: 'High',   active: true,  notes: 'Oklahoma — primary market' },
  { name: 'OKLAHOMA TRUCKING JOBS FORUM',                                  url: null, category: 'mixed',           priority: 'High',   active: true,  notes: 'Oklahoma — primary market' },
  { name: 'Sand Haulers And Owner Operators',                              url: null, category: 'mixed',           priority: 'Low',    active: true,  notes: 'Sand/bulk niche — low relevance' },
  { name: 'Trucker, Dispatcher, Broker, Shipper - USA',                   url: null, category: 'mixed',           priority: 'High',   active: true,  notes: null },

  // ── Other ────────────────────────────────────────────────────────────────────
  { name: 'Daycab/Sleeper Semi-Trucks For Sale',                          url: null, category: 'other',           priority: 'Low',    active: true,  notes: 'Equipment sales — monitor for new authority buyers' },
  { name: 'Oklahoma Semi Trucks And Trailers For Sale',                   url: null, category: 'other',           priority: 'Low',    active: true,  notes: 'Equipment sales' },
  { name: 'Pilot car load board',                                          url: null, category: 'other',           priority: 'Low',    active: false, notes: 'Not relevant to dispatch operations' },
  { name: 'Pilot Car Load Board Oklahoma and Surrounding states',         url: null, category: 'other',           priority: 'Low',    active: false, notes: 'Not relevant to dispatch operations' },
  { name: 'Self Storage Owners, Operators, and Investors',                url: null, category: 'other',           priority: 'Low',    active: false, notes: 'Not relevant to trucking' },

]
