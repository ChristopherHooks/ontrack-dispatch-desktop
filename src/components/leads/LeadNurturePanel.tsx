import { useState } from 'react'
import { ChevronDown, Check, Zap, ArrowRight, Clock } from 'lucide-react'
import type { Lead } from '../../types/models'
import {
  NURTURE_SEQUENCES,
  getSequence,
  nextStep,
  nextStepDate,
  type NurtureSequence,
} from '../../lib/leadNurtureSequences'

interface Props {
  lead:     Lead
  onUpdate: (updated: Lead) => void
}

const METHOD_COLOR: Record<string, string> = {
  Call:  'bg-blue-900/20 border-blue-700/30 text-blue-400',
  SMS:   'bg-green-900/20 border-green-700/30 text-green-400',
  Email: 'bg-orange-900/20 border-orange-700/30 text-orange-400',
  DM:    'bg-purple-900/20 border-purple-700/30 text-purple-400',
}

export function LeadNurturePanel({ lead, onUpdate }: Props) {
  const [sequenceId, setSequenceId] = useState<string>(() => {
    // Pick a sensible default based on how many attempts have been made
    if ((lead.contact_attempt_count ?? 0) === 0) return 'standard-7day'
    if ((lead.contact_attempt_count ?? 0) <= 5) return 'warm-14day'
    return 'reactivation'
  })
  const [expanded, setExpanded] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  const sequence = getSequence(sequenceId) as NurtureSequence
  const attempts  = lead.contact_attempt_count ?? 0
  const step      = nextStep(sequence, attempts)
  const isComplete = step === null
  const progress   = Math.min(attempts, sequence.steps.length)

  const handleAdvance = async () => {
    if (!step) return
    setAdvancing(true)
    try {
      const followUpDate = nextStepDate(step, lead.last_contact_date)
      const today = new Date().toISOString().split('T')[0]
      const updated = await window.api.leads.update(lead.id, {
        contact_attempt_count: attempts + 1,
        last_contact_date:     today,
        contact_method:        step.method,
        outreach_outcome:      step.label,
        follow_up_date:        followUpDate,
        status:                step.targetStatus as Lead['status'],
      })
      if (updated) onUpdate(updated)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className='space-y-3'>
      {/* Sequence selector */}
      <div className='flex items-center gap-2'>
        <select
          value={sequenceId}
          onChange={e => setSequenceId(e.target.value)}
          className='flex-1 h-7 px-2 text-xs bg-surface-600 border border-surface-400 rounded-lg text-gray-300 focus:outline-none focus:border-orange-600/50'
        >
          {NURTURE_SEQUENCES.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setExpanded(v => !v)}
          className='flex items-center gap-1 text-2xs text-gray-600 hover:text-gray-300 transition-colors'
        >
          All steps <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-2xs text-gray-600'>
            {isComplete ? 'Sequence complete' : `Step ${progress + 1} of ${sequence.steps.length}`}
          </span>
          <span className='text-2xs text-gray-600'>{attempts} outreach{attempts !== 1 ? 'es' : ''} logged</span>
        </div>
        <div className='h-1.5 bg-surface-600 rounded-full overflow-hidden'>
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${(progress / sequence.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current step card */}
      {!isComplete && step && (
        <div className='bg-surface-700/60 border border-surface-500 rounded-xl p-3 space-y-2'>
          <div className='flex items-center gap-2'>
            <span className={`text-2xs px-2 py-0.5 rounded-full border font-medium ${METHOD_COLOR[step.method] ?? METHOD_COLOR.Call}`}>
              {step.method}
            </span>
            <span className='text-xs font-semibold text-gray-200'>{step.label}</span>
            <span className='text-2xs text-gray-600 ml-auto'>Next action</span>
          </div>
          <p className='text-xs font-medium text-gray-100'>{step.action}</p>
          <p className='text-2xs text-gray-500 italic leading-relaxed'>{step.scriptHint}</p>
          {lead.last_contact_date && (
            <div className='flex items-center gap-1 text-2xs text-gray-600'>
              <Clock size={9} />
              Suggested follow-up: <span className='text-gray-400 font-mono'>{nextStepDate(step, lead.last_contact_date)}</span>
            </div>
          )}
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className='w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors'
          >
            <Zap size={11} />
            {advancing ? 'Logging…' : `Log "${step.method}" & Advance`}
          </button>
        </div>
      )}

      {isComplete && (
        <div className='flex items-center gap-2 py-2 px-3 bg-green-900/15 border border-green-700/25 rounded-xl'>
          <Check size={13} className='text-green-400 shrink-0' />
          <p className='text-xs text-green-300'>Sequence complete — {attempts} touches logged.</p>
        </div>
      )}

      {/* All steps (expanded) */}
      {expanded && (
        <div className='space-y-1'>
          {sequence.steps.map((s, i) => {
            const done = i < progress
            const current = i === progress && !isComplete
            return (
              <div
                key={s.stepNumber}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-2xs transition-colors
                  ${done ? 'opacity-50' : current ? 'bg-surface-700/50 border border-surface-500' : 'opacity-40'}`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border
                  ${done ? 'bg-green-900/40 border-green-600/40 text-green-400' :
                    current ? 'bg-orange-900/40 border-orange-600/40 text-orange-400' :
                    'bg-surface-600 border-surface-500 text-gray-600'}`}>
                  {done ? <Check size={8} /> : <span className='text-2xs font-bold'>{s.stepNumber}</span>}
                </div>
                <span className={`font-medium ${done ? 'text-gray-500' : current ? 'text-gray-200' : 'text-gray-600'}`}>
                  {s.label}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full border ${METHOD_COLOR[s.method] ?? METHOD_COLOR.Call}`}>
                  {s.method}
                </span>
                {i < sequence.steps.length - 1 && (
                  <span className='text-gray-700 ml-auto text-2xs'>+{sequence.steps[i + 1].daysFromPrev}d</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
