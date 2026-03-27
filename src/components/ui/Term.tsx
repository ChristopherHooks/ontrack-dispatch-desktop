/**
 * <Term> — inline tooltip for trucking industry terms.
 *
 * Usage:
 *   <Term word="RPM">Rate per mile</Term>
 *   <Term word="COI" />   ← uses word as display text
 *
 * Pulls the definition from INDUSTRY_TERMS by partial case-insensitive match
 * on the term field. Falls back to the `def` prop if no match found.
 *
 * The tooltip is positioned above the word and uses a simple CSS hover pattern
 * so it works without any portal or positioning library.
 */
import { INDUSTRY_TERMS } from '../../data/industryTerms'

interface Props {
  word:     string         // key used to look up the definition
  def?:     string         // fallback definition if no match in INDUSTRY_TERMS
  children?: React.ReactNode  // display text; defaults to word
}

function findDef(word: string): string | null {
  const q = word.toLowerCase()
  const match = INDUSTRY_TERMS.find(t =>
    t.term.toLowerCase().includes(q) ||
    q.includes(t.term.split('—')[0].trim().toLowerCase())
  )
  return match?.definition ?? null
}

export function Term({ word, def, children }: Props) {
  const definition = findDef(word) ?? def
  const display    = children ?? word

  if (!definition) {
    return <span>{display}</span>
  }

  return (
    <span className='relative inline-block group/term'>
      <span className='border-b border-dashed border-gray-600 cursor-help text-inherit'>
        {display}
      </span>
      {/* Tooltip */}
      <span
        className='
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[300]
          w-64 bg-surface-600 border border-surface-300 rounded-xl shadow-2xl
          px-3 py-2.5 text-xs text-gray-300 leading-relaxed
          opacity-0 group-hover/term:opacity-100
          transition-opacity duration-150
        '
      >
        <span className='block text-2xs font-bold text-orange-400 mb-1 uppercase tracking-wide'>{word}</span>
        {definition}
        {/* Arrow */}
        <span className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-surface-300' />
      </span>
    </span>
  )
}
