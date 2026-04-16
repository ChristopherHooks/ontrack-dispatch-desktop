/**
 * uiTokens.ts
 * Semantic Tailwind class tokens for OnTrack Dispatch Dashboard.
 *
 * Rules:
 *  - All values are plain Tailwind class strings (no CSS variables).
 *  - Use `dark:` prefixes where light/dark behavior diverges.
 *  - Do not add arbitrary values. Extend tailwind.config.js instead.
 *  - Import and use these instead of ad hoc one-off class strings.
 */

// ---------------------------------------------------------------------------
// Text hierarchy
// ---------------------------------------------------------------------------

export const text = {
  /** Page-level headings, drawer names. ~gray-100 */
  primary:   'text-gray-100',
  /** Field values, body content, important data. ~gray-200 */
  secondary: 'text-gray-200',
  /** Labels, sub-labels, secondary descriptors. ~gray-400 */
  muted:     'text-gray-400',
  /** Timestamps, empty-state copy, helper text. ~gray-500 */
  subtle:    'text-gray-500',
} as const

// ---------------------------------------------------------------------------
// Typography composites
// ---------------------------------------------------------------------------

export const type = {
  /** h1 — top of page */
  pageTitle:    'text-xl font-bold text-gray-100',
  /** h2 — section inside a drawer or card, uppercase */
  sectionTitle: 'text-xs font-semibold text-gray-300 uppercase tracking-wider',
  /** h3 — card/panel title, normal case */
  cardTitle:    'text-sm font-semibold text-gray-200',
  /** Form / data label above a value */
  label:        'text-xs text-gray-400',
  /** Data value below a label */
  value:        'text-sm text-gray-200',
  /** 2xs label, e.g. badge labels, inline sub-labels */
  microLabel:   'text-2xs text-gray-400',
  /** Inline helper / hint / placeholder prose */
  helper:       'text-xs text-gray-400 italic',
  /** Empty-state copy */
  empty:        'text-2xs text-gray-500 italic',
  /** Timestamp or metadata line */
  meta:         'text-2xs text-gray-500',
} as const

// ---------------------------------------------------------------------------
// Surface backgrounds
// ---------------------------------------------------------------------------

export const surface = {
  /** Primary app/page background */
  page:      'bg-surface-800',
  /** Card / panel surface (white in light, dark in dark) */
  card:      'bg-surface-700',
  /** Slightly elevated, e.g. inner card or hover target */
  elevated:  'bg-surface-600',
  /** Input background */
  input:     'bg-surface-500',
  /** Highlight panel (orange tint) */
  highlight: 'bg-orange-600/10',
} as const

// ---------------------------------------------------------------------------
// Border tokens
// ---------------------------------------------------------------------------

export const border = {
  /** Section dividers inside drawers (dark-mode safe; not overridden in light — use only in dark-anchored surfaces) */
  section: 'border-surface-600',
  /** Card / panel outer border — light-mode safe via CSS override */
  card:    'border-surface-400',
  /** Strong outer border — light-mode safe */
  strong:  'border-surface-400',
  /** Subtle section hairline — light-mode safe */
  subtle:  'border-surface-400/60',
} as const

// ---------------------------------------------------------------------------
// Badge tokens
// Badge surfaces use `dark:` prefix so they look good in both themes:
//  - light mode: soft tinted bg (X-500/10) with medium border (X-500/25)
//  - dark mode : deeper tinted bg (X-900/40) with subtle border (X-700/40)
// Text colors are the same in both modes — acceptable in both.
// ---------------------------------------------------------------------------

export const badge = {
  /** Default / neutral — no semantic color */
  neutral: 'bg-surface-500 dark:bg-surface-500 text-gray-400 border border-surface-400',

  /** Blue — informational, "Dispatch" category */
  info:    'bg-blue-500/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-500/25 dark:border-blue-700/40',

  /** Teal — brokers */
  teal:    'bg-teal-500/10 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 border border-teal-500/25 dark:border-teal-700/40',

  /** Green — success, approved, on-time */
  success: 'bg-green-500/10 dark:bg-green-900/40 text-green-600 dark:text-green-400 border border-green-500/25 dark:border-green-700/40',

  /** Yellow — caution, pending, submitted */
  caution: 'bg-yellow-500/10 dark:bg-yellow-900/35 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25 dark:border-yellow-700/40',

  /** Orange — warning, new-authority, expiring */
  warning: 'bg-orange-500/10 dark:bg-orange-900/35 text-orange-600 dark:text-orange-400 border border-orange-500/25 dark:border-orange-700/35',

  /** Red — danger, denied, overdue, avoid */
  danger:  'bg-red-500/10 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-500/25 dark:border-red-700/40',

  /** Purple — leads category, marketing */
  purple:  'bg-purple-500/10 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-500/25 dark:border-purple-700/40',

  /** Sky — reference category */
  sky:     'bg-sky-500/10 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-500/25 dark:border-sky-700/40',

  /** Emerald — finance category */
  emerald: 'bg-emerald-500/10 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 dark:border-emerald-700/40',

  /** Amber — template category */
  amber:   'bg-amber-500/10 dark:bg-amber-900/35 text-amber-600 dark:text-amber-400 border border-amber-500/25 dark:border-amber-700/35',

  /** Pink — marketing category */
  pink:    'bg-pink-500/10 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 border border-pink-500/25 dark:border-pink-700/40',

  /** Cyan — "Available Soon" dispatcher board group */
  cyan:    'bg-cyan-500/10 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 dark:border-cyan-700/40',
} as const

// ---------------------------------------------------------------------------
// Category → badge token map
// Single source of truth for all category-keyed badge colors.
// ---------------------------------------------------------------------------

export const categoryBadge: Record<string, string> = {
  Dispatch:        badge.info,
  Drivers:         badge.success,
  Sales:           badge.warning,
  Marketing:       badge.pink,
  Brokers:         badge.teal,
  Finance:         badge.emerald,
  Template:        badge.amber,
  Reference:       badge.sky,
  Policy:          badge.danger,
  Other:           badge.neutral,
  // Legacy aliases
  SOP:             badge.info,
  Training:        badge.success,
  'New Authority': badge.warning,
}

// ---------------------------------------------------------------------------
// Convenience re-export as a single namespace
// ---------------------------------------------------------------------------

export const ui = { text, type, surface, border, badge, categoryBadge } as const
