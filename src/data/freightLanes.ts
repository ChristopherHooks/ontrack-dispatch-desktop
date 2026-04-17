/**
 * freightLanes.ts
 * Static outbound lane map for U.S. freight markets.
 *
 * Each entry describes a strong/common outbound corridor from an origin market.
 * Priority: 1 (low) – 10 (high) relative to typical spot-market freight volume.
 * estimatedMiles: approximate one-way truck miles.
 * tripCategory: 'short' <300mi | 'regional' 300-700mi | 'long' >700mi
 * tags: human-readable reason tags surfaced in the lane suggestion UI.
 *
 * No AI. No external data. Fully static and deterministic.
 */

import type { MarketKey } from './freightMarkets'

export type TripCategory = 'short' | 'regional' | 'long'

export interface LaneEntry {
  dest: MarketKey
  priority: number
  estimatedMiles: number
  tripCategory: TripCategory
  tags: string[]
}

export const FREIGHT_LANES: Record<MarketKey, LaneEntry[]> = {
  okc: [
    { dest: 'dfw',          priority: 9, estimatedMiles: 210,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'houston',      priority: 8, estimatedMiles: 450,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'kansas_city',  priority: 7, estimatedMiles: 340,  tripCategory: 'regional', tags: ['strong-corridor', 'reload-market'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 520,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'atlanta',      priority: 6, estimatedMiles: 800,  tripCategory: 'long',     tags: ['long-haul', 'high-volume'] },
    { dest: 'chicago',      priority: 6, estimatedMiles: 710,  tripCategory: 'long',     tags: ['reload-market', 'high-volume'] },
    { dest: 'denver',       priority: 5, estimatedMiles: 640,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 500,  tripCategory: 'regional', tags: ['regional'] },
  ],

  dfw: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 790,  tripCategory: 'long',     tags: ['high-volume', 'strong-corridor'] },
    { dest: 'houston',      priority: 9, estimatedMiles: 240,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 920,  tripCategory: 'long',     tags: ['reload-market', 'high-volume'] },
    { dest: 'kansas_city',  priority: 7, estimatedMiles: 500,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 470,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'nashville',    priority: 6, estimatedMiles: 670,  tripCategory: 'long',     tags: ['regional', 'strong-corridor'] },
    { dest: 'okc',          priority: 6, estimatedMiles: 210,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'san_antonio',  priority: 5, estimatedMiles: 280,  tripCategory: 'short',    tags: ['regional'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 640,  tripCategory: 'regional', tags: ['regional'] },
  ],

  houston: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 790,  tripCategory: 'long',     tags: ['high-volume', 'strong-corridor'] },
    { dest: 'nashville',    priority: 8, estimatedMiles: 800,  tripCategory: 'long',     tags: ['strong-corridor'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 240,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 570,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'chicago',      priority: 7, estimatedMiles: 1090, tripCategory: 'long',     tags: ['reload-market', 'long-haul'] },
    { dest: 'jacksonville', priority: 6, estimatedMiles: 830,  tripCategory: 'long',     tags: ['Southeast', 'long-haul'] },
    { dest: 'new_orleans',  priority: 6, estimatedMiles: 350,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'san_antonio',  priority: 5, estimatedMiles: 200,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  chicago: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 720,  tripCategory: 'long',     tags: ['high-volume', 'strong-corridor'] },
    { dest: 'dfw',          priority: 9, estimatedMiles: 920,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'columbus',     priority: 8, estimatedMiles: 360,  tripCategory: 'regional', tags: ['high-volume', 'regional'] },
    { dest: 'indianapolis', priority: 8, estimatedMiles: 180,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'memphis',      priority: 8, estimatedMiles: 530,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'st_louis',     priority: 7, estimatedMiles: 300,  tripCategory: 'regional', tags: ['reload-market', 'regional'] },
    { dest: 'nashville',    priority: 7, estimatedMiles: 470,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'kansas_city',  priority: 6, estimatedMiles: 500,  tripCategory: 'regional', tags: ['reload-market'] },
    { dest: 'detroit',      priority: 6, estimatedMiles: 280,  tripCategory: 'short',    tags: ['short-reposition', 'regional'] },
    { dest: 'minneapolis',  priority: 5, estimatedMiles: 410,  tripCategory: 'regional', tags: ['regional'] },
  ],

  atlanta: [
    { dest: 'charlotte',    priority: 9, estimatedMiles: 250,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'chicago',      priority: 9, estimatedMiles: 720,  tripCategory: 'long',     tags: ['reload-market', 'high-volume'] },
    { dest: 'jacksonville', priority: 8, estimatedMiles: 350,  tripCategory: 'regional', tags: ['regional', 'Southeast'] },
    { dest: 'nashville',    priority: 8, estimatedMiles: 250,  tripCategory: 'short',    tags: ['strong-corridor', 'short-reposition'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 790,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 390,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'columbus',     priority: 6, estimatedMiles: 690,  tripCategory: 'long',     tags: ['reload-market'] },
    { dest: 'miami',        priority: 5, estimatedMiles: 660,  tripCategory: 'long',     tags: ['Southeast', 'long-haul'] },
  ],

  kansas_city: [
    { dest: 'dfw',          priority: 9, estimatedMiles: 500,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 500,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'st_louis',     priority: 8, estimatedMiles: 250,  tripCategory: 'short',    tags: ['reload-market', 'short-reposition'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 440,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'denver',       priority: 7, estimatedMiles: 600,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'omaha',        priority: 6, estimatedMiles: 190,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'indianapolis', priority: 5, estimatedMiles: 480,  tripCategory: 'regional', tags: ['regional'] },
  ],

  memphis: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 390,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'nashville',    priority: 9, estimatedMiles: 210,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 530,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 470,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'charlotte',    priority: 7, estimatedMiles: 640,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'st_louis',     priority: 7, estimatedMiles: 290,  tripCategory: 'short',    tags: ['reload-market', 'short-reposition'] },
    { dest: 'indianapolis', priority: 6, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'kansas_city',  priority: 5, estimatedMiles: 440,  tripCategory: 'regional', tags: ['reload-market'] },
  ],

  nashville: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 250,  tripCategory: 'short',    tags: ['high-volume', 'strong-corridor'] },
    { dest: 'charlotte',    priority: 8, estimatedMiles: 410,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 470,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 210,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'dfw',          priority: 7, estimatedMiles: 670,  tripCategory: 'long',     tags: ['strong-corridor'] },
    { dest: 'columbus',     priority: 6, estimatedMiles: 350,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'indianapolis', priority: 6, estimatedMiles: 290,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 330,  tripCategory: 'regional', tags: ['reload-market'] },
    { dest: 'louisville',   priority: 5, estimatedMiles: 180,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  charlotte: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 250,  tripCategory: 'short',    tags: ['high-volume', 'strong-corridor'] },
    { dest: 'jacksonville', priority: 8, estimatedMiles: 430,  tripCategory: 'regional', tags: ['Southeast', 'strong-corridor'] },
    { dest: 'nashville',    priority: 7, estimatedMiles: 410,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'columbus',     priority: 7, estimatedMiles: 500,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'chicago',      priority: 7, estimatedMiles: 790,  tripCategory: 'long',     tags: ['reload-market', 'long-haul'] },
    { dest: 'memphis',      priority: 6, estimatedMiles: 640,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'dfw',          priority: 5, estimatedMiles: 1150, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  jacksonville: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 350,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'charlotte',    priority: 8, estimatedMiles: 430,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'nashville',    priority: 7, estimatedMiles: 600,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'dfw',          priority: 6, estimatedMiles: 1000, tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'miami',        priority: 5, estimatedMiles: 340,  tripCategory: 'regional', tags: ['Southeast', 'short-reposition'] },
    { dest: 'tampa',        priority: 5, estimatedMiles: 200,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  columbus: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 690,  tripCategory: 'long',     tags: ['high-volume', 'strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 360,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'nashville',    priority: 7, estimatedMiles: 350,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'charlotte',    priority: 7, estimatedMiles: 500,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'indianapolis', priority: 7, estimatedMiles: 175,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'memphis',      priority: 6, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'detroit',      priority: 5, estimatedMiles: 170,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'dfw',          priority: 5, estimatedMiles: 1100, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  indianapolis: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 530,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 180,  tripCategory: 'short',    tags: ['reload-market', 'high-volume'] },
    { dest: 'nashville',    priority: 8, estimatedMiles: 290,  tripCategory: 'short',    tags: ['strong-corridor'] },
    { dest: 'columbus',     priority: 7, estimatedMiles: 175,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'st_louis',     priority: 7, estimatedMiles: 240,  tripCategory: 'short',    tags: ['reload-market'] },
    { dest: 'memphis',      priority: 6, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'louisville',   priority: 5, estimatedMiles: 115,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'detroit',      priority: 5, estimatedMiles: 270,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  st_louis: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 300,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'nashville',    priority: 8, estimatedMiles: 330,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'memphis',      priority: 8, estimatedMiles: 290,  tripCategory: 'short',    tags: ['strong-corridor', 'short-reposition'] },
    { dest: 'dfw',          priority: 7, estimatedMiles: 640,  tripCategory: 'regional', tags: ['high-volume'] },
    { dest: 'kansas_city',  priority: 7, estimatedMiles: 250,  tripCategory: 'short',    tags: ['reload-market', 'short-reposition'] },
    { dest: 'indianapolis', priority: 6, estimatedMiles: 240,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'atlanta',      priority: 5, estimatedMiles: 730,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  denver: [
    { dest: 'kansas_city',  priority: 8, estimatedMiles: 600,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 1000, tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'okc',          priority: 7, estimatedMiles: 640,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'chicago',      priority: 7, estimatedMiles: 1000, tripCategory: 'long',     tags: ['reload-market', 'long-haul'] },
    { dest: 'phoenix',      priority: 6, estimatedMiles: 600,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'los_angeles',  priority: 6, estimatedMiles: 1020, tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'salt_lake',    priority: 5, estimatedMiles: 380,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'omaha',        priority: 5, estimatedMiles: 540,  tripCategory: 'regional', tags: ['regional'] },
  ],

  phoenix: [
    { dest: 'los_angeles',  priority: 9, estimatedMiles: 370,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'las_vegas',    priority: 8, estimatedMiles: 290,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 1080, tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'denver',       priority: 7, estimatedMiles: 600,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'san_antonio',  priority: 6, estimatedMiles: 860,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'albuquerque',  priority: 5, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'salt_lake',    priority: 5, estimatedMiles: 680,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  los_angeles: [
    { dest: 'phoenix',      priority: 9, estimatedMiles: 370,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'las_vegas',    priority: 8, estimatedMiles: 270,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 1430, tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'salt_lake',    priority: 7, estimatedMiles: 690,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'seattle',      priority: 6, estimatedMiles: 1140, tripCategory: 'long',     tags: ['long-haul', 'reload-market'] },
    { dest: 'denver',       priority: 6, estimatedMiles: 1020, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  las_vegas: [
    { dest: 'los_angeles',  priority: 9, estimatedMiles: 270,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'phoenix',      priority: 8, estimatedMiles: 290,  tripCategory: 'short',    tags: ['strong-corridor'] },
    { dest: 'salt_lake',    priority: 7, estimatedMiles: 420,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'denver',       priority: 6, estimatedMiles: 760,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'dfw',          priority: 5, estimatedMiles: 1240, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  salt_lake: [
    { dest: 'las_vegas',    priority: 8, estimatedMiles: 420,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'denver',       priority: 8, estimatedMiles: 380,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'los_angeles',  priority: 7, estimatedMiles: 690,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'seattle',      priority: 6, estimatedMiles: 840,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'phoenix',      priority: 5, estimatedMiles: 680,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'portland',     priority: 5, estimatedMiles: 770,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  seattle: [
    { dest: 'portland',     priority: 9, estimatedMiles: 180,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'los_angeles',  priority: 8, estimatedMiles: 1140, tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'salt_lake',    priority: 7, estimatedMiles: 840,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'denver',       priority: 6, estimatedMiles: 1320, tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'minneapolis',  priority: 5, estimatedMiles: 1650, tripCategory: 'long',     tags: ['long-haul', 'reload-market'] },
  ],

  portland: [
    { dest: 'seattle',      priority: 9, estimatedMiles: 180,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'los_angeles',  priority: 8, estimatedMiles: 960,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'salt_lake',    priority: 7, estimatedMiles: 770,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'denver',       priority: 5, estimatedMiles: 1240, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  minneapolis: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 410,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'kansas_city',  priority: 7, estimatedMiles: 440,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'omaha',        priority: 7, estimatedMiles: 380,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'detroit',      priority: 6, estimatedMiles: 650,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'des_moines',   priority: 6, estimatedMiles: 240,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 560,  tripCategory: 'regional', tags: ['regional'] },
  ],

  detroit: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 280,  tripCategory: 'short',    tags: ['reload-market', 'high-volume'] },
    { dest: 'columbus',     priority: 8, estimatedMiles: 170,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'cleveland',    priority: 7, estimatedMiles: 170,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'atlanta',      priority: 7, estimatedMiles: 720,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'nashville',    priority: 6, estimatedMiles: 520,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'indianapolis', priority: 6, estimatedMiles: 270,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  cleveland: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 345,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'columbus',     priority: 8, estimatedMiles: 145,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'atlanta',      priority: 7, estimatedMiles: 730,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'nashville',    priority: 6, estimatedMiles: 530,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'detroit',      priority: 6, estimatedMiles: 170,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'philadelphia', priority: 5, estimatedMiles: 430,  tripCategory: 'regional', tags: ['regional'] },
  ],

  cincinnati: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 440,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 300,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'nashville',    priority: 8, estimatedMiles: 270,  tripCategory: 'short',    tags: ['strong-corridor'] },
    { dest: 'columbus',     priority: 7, estimatedMiles: 110,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'indianapolis', priority: 6, estimatedMiles: 115,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'charlotte',    priority: 5, estimatedMiles: 450,  tripCategory: 'regional', tags: ['regional'] },
  ],

  louisville: [
    { dest: 'nashville',    priority: 9, estimatedMiles: 180,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'atlanta',      priority: 8, estimatedMiles: 430,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'chicago',      priority: 8, estimatedMiles: 300,  tripCategory: 'regional', tags: ['reload-market'] },
    { dest: 'indianapolis', priority: 7, estimatedMiles: 115,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'memphis',      priority: 6, estimatedMiles: 390,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'columbus',     priority: 5, estimatedMiles: 190,  tripCategory: 'short',    tags: ['short-reposition'] },
  ],

  new_york: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 790,  tripCategory: 'long',     tags: ['reload-market', 'high-volume'] },
    { dest: 'atlanta',      priority: 8, estimatedMiles: 870,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'philadelphia', priority: 8, estimatedMiles: 95,   tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'charlotte',    priority: 7, estimatedMiles: 650,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'miami',        priority: 6, estimatedMiles: 1280, tripCategory: 'long',     tags: ['long-haul', 'Southeast'] },
    { dest: 'columbus',     priority: 5, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
  ],

  philadelphia: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 760,  tripCategory: 'long',     tags: ['reload-market', 'high-volume'] },
    { dest: 'atlanta',      priority: 8, estimatedMiles: 790,  tripCategory: 'long',     tags: ['high-volume', 'long-haul'] },
    { dest: 'new_york',     priority: 7, estimatedMiles: 95,   tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'charlotte',    priority: 7, estimatedMiles: 530,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'columbus',     priority: 6, estimatedMiles: 430,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'nashville',    priority: 5, estimatedMiles: 810,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  miami: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 660,  tripCategory: 'long',     tags: ['high-volume', 'strong-corridor'] },
    { dest: 'jacksonville', priority: 8, estimatedMiles: 340,  tripCategory: 'regional', tags: ['short-reposition', 'Southeast'] },
    { dest: 'tampa',        priority: 7, estimatedMiles: 280,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'charlotte',    priority: 6, estimatedMiles: 740,  tripCategory: 'long',     tags: ['long-haul'] },
    { dest: 'new_york',     priority: 5, estimatedMiles: 1280, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  tampa: [
    { dest: 'atlanta',      priority: 9, estimatedMiles: 460,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'jacksonville', priority: 8, estimatedMiles: 200,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'miami',        priority: 7, estimatedMiles: 280,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'charlotte',    priority: 6, estimatedMiles: 620,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'nashville',    priority: 5, estimatedMiles: 670,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  new_orleans: [
    { dest: 'houston',      priority: 9, estimatedMiles: 350,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'atlanta',      priority: 8, estimatedMiles: 470,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'memphis',      priority: 7, estimatedMiles: 400,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'dfw',          priority: 6, estimatedMiles: 510,  tripCategory: 'regional', tags: ['high-volume'] },
    { dest: 'nashville',    priority: 5, estimatedMiles: 560,  tripCategory: 'regional', tags: ['regional'] },
  ],

  el_paso: [
    { dest: 'dfw',          priority: 8, estimatedMiles: 620,  tripCategory: 'regional', tags: ['high-volume', 'strong-corridor'] },
    { dest: 'phoenix',      priority: 8, estimatedMiles: 430,  tripCategory: 'regional', tags: ['strong-corridor'] },
    { dest: 'san_antonio',  priority: 7, estimatedMiles: 560,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'albuquerque',  priority: 7, estimatedMiles: 270,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'los_angeles',  priority: 6, estimatedMiles: 800,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  san_antonio: [
    { dest: 'houston',      priority: 9, estimatedMiles: 200,  tripCategory: 'short',    tags: ['high-volume', 'short-reposition'] },
    { dest: 'dfw',          priority: 8, estimatedMiles: 280,  tripCategory: 'short',    tags: ['high-volume'] },
    { dest: 'el_paso',      priority: 7, estimatedMiles: 560,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'okc',          priority: 6, estimatedMiles: 440,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'atlanta',      priority: 5, estimatedMiles: 1100, tripCategory: 'long',     tags: ['long-haul'] },
  ],

  albuquerque: [
    { dest: 'dfw',          priority: 8, estimatedMiles: 640,  tripCategory: 'regional', tags: ['high-volume'] },
    { dest: 'phoenix',      priority: 7, estimatedMiles: 470,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'el_paso',      priority: 7, estimatedMiles: 270,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'denver',       priority: 6, estimatedMiles: 460,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'los_angeles',  priority: 5, estimatedMiles: 790,  tripCategory: 'long',     tags: ['long-haul'] },
  ],

  omaha: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 460,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'kansas_city',  priority: 8, estimatedMiles: 190,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'des_moines',   priority: 7, estimatedMiles: 140,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'denver',       priority: 6, estimatedMiles: 540,  tripCategory: 'regional', tags: ['regional'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 480,  tripCategory: 'regional', tags: ['regional'] },
  ],

  des_moines: [
    { dest: 'chicago',      priority: 9, estimatedMiles: 310,  tripCategory: 'regional', tags: ['reload-market', 'high-volume'] },
    { dest: 'kansas_city',  priority: 8, estimatedMiles: 200,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'omaha',        priority: 7, estimatedMiles: 140,  tripCategory: 'short',    tags: ['short-reposition'] },
    { dest: 'minneapolis',  priority: 6, estimatedMiles: 240,  tripCategory: 'short',    tags: ['regional'] },
    { dest: 'st_louis',     priority: 5, estimatedMiles: 340,  tripCategory: 'regional', tags: ['regional'] },
  ],
}
