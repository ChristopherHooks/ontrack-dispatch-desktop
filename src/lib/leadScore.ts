import type { Lead } from '../types/models'

export interface ScoreFactor {
  label:  string
  points: number
  met:    boolean
}

export interface LeadScoreResult {
  total:   number            // 0–100
  grade:   'Hot' | 'Warm' | 'Cold'
  factors: ScoreFactor[]
}

export function computeLeadScore(lead: Lead): LeadScoreResult {
  const factors: ScoreFactor[] = [
    { label: 'Has MC number',          points: 20, met: Boolean(lead.mc_number)    },
    { label: 'Status: Interested/Converted', points: 20, met: lead.status === 'Interested' || lead.status === 'Signed' || lead.status === 'Converted' || lead.status === 'Call Back Later' },
    { label: 'Has phone number',       points: 15, met: Boolean(lead.phone)        },
    { label: 'High priority',          points: 15, met: lead.priority === 'High'   },
    { label: 'Has company name',       points: 10, met: Boolean(lead.company)      },
    { label: 'Has email address',      points: 10, met: Boolean(lead.email)        },
    { label: 'Has trailer type',       points:  5, met: Boolean(lead.trailer_type) },
    { label: 'Has authority date',     points:  5, met: Boolean(lead.authority_date) },
  ]
  const total = Math.min(100, factors.reduce((s, f) => s + (f.met ? f.points : 0), 0))
  const grade: LeadScoreResult['grade'] =
    total >= 60 ? 'Hot' : total >= 30 ? 'Warm' : 'Cold'
  return { total, grade, factors }
}
