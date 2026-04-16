import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  ArrowRight, Rocket, AlertTriangle,
} from 'lucide-react'
import type { OperationsData } from '../../types/models'

// ---------------------------------------------------------------------------
// LaunchSprintPanel
// Shows on the Operations page for new users until their first invoice is sent.
// Tracks 5 milestones: Setup → Leads → Driver → Load → Invoice
// Disappears permanently once hasSentOrPaidInvoice is true.
// ---------------------------------------------------------------------------

interface Props {
  ops:             OperationsData
  companyName:     string
  firstLaunchDate: string
  loading:         boolean
}

interface Milestone {
  id:      string
  label:   string
  done:    boolean
  actions: Array<{ text: string; route: string; cta: string }>
}

function dayNumber(firstLaunchDate: string): number {
  if (!firstLaunchDate) return 1
  const launch = new Date(firstLaunchDate + 'T00:00:00')
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((today.getTime() - launch.getTime()) / 86400000) + 1)
}

export function LaunchSprintPanel({ ops, companyName, firstLaunchDate, loading }: Props) {
  const navigate       = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  if (loading) return null
  // Disappear once the first invoice is sent — goal achieved
  if (ops.hasSentOrPaidInvoice) return null

  const day     = dayNumber(firstLaunchDate)
  const urgent  = day > 7
  const dayLabel = urgent ? `Day ${day} — past 7-day target` : `Day ${day} of 7`
  const dayColor = urgent ? 'text-red-700 dark:text-red-400' : day >= 5 ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-700 dark:text-blue-400'

  // ── Milestone detection ──────────────────────────────────────────────────
  const setupDone  = companyName.trim().length > 0 && ops.totalBrokers >= 3
  const leadsDone  = ops.totalLeads  >= 3
  const driverDone = ops.totalDrivers >= 1
  // A load is "booked" when any load exists beyond Searching status
  const loadDone   = ops.loadsInTransit > 0
    || ops.uninvoicedDelivered > 0
    || ops.outstandingInvoices > 0

  const milestones: Milestone[] = [
    {
      id:    'setup',
      label: 'Complete setup',
      done:  setupDone,
      actions: [
        {
          text: companyName.trim().length === 0
            ? 'Your company name is not set — it appears on every invoice. Add it in Settings now.'
            : 'Company info is set.',
          route: '/settings',
          cta:   'Open Settings',
        },
        {
          text: ops.totalBrokers < 3
            ? `You have ${ops.totalBrokers} broker${ops.totalBrokers !== 1 ? 's' : ''} set up. You need at least 3 broker approvals before you can book any load — go to Brokers and click "Add Starter Brokers" to load 20 established brokers instantly.`
            : `${ops.totalBrokers} brokers set up.`,
          route: '/brokers',
          cta:   'Open Brokers',
        },
      ],
    },
    {
      id:    'leads',
      label: 'Build your lead pipeline',
      done:  leadsDone,
      actions: [
        {
          text: 'Post in Facebook trucking groups today. Use the Marketing page to generate a ready-to-post ad — copy it and paste it into 2 or 3 groups. Do this every day.',
          route: '/marketing',
          cta:   'Open Marketing',
        },
        {
          text: `You have ${ops.totalLeads} active lead${ops.totalLeads !== 1 ? 's' : ''}. Every person who replies to your post gets added as a Lead immediately — even if they seem unqualified. You need 10+ leads to realistically land your first driver this week.`,
          route: '/leads',
          cta:   'Open Leads',
        },
      ],
    },
    {
      id:    'driver',
      label: 'Sign your first driver',
      done:  driverDone,
      actions: [
        {
          text: 'Send your dispatch agreement to your best lead today. Open their record, click the Agreement button, and send it. Follow up within 24 hours of sending — leads go cold fast.',
          route: '/leads',
          cta:   'Open Leads',
        },
        {
          text: 'Once they sign, convert them to a Driver and complete their carrier setup: COI on file, W-9 on file, and broker packets submitted to at least 2 brokers.',
          route: '/drivers',
          cta:   'Open Drivers',
        },
      ],
    },
    {
      id:    'load',
      label: 'Book your first load',
      done:  loadDone,
      actions: [
        {
          text: 'Open your driver record and confirm their carrier setup is complete before you call a single broker. A load booked before setup is done can fall apart at pickup.',
          route: '/drivers',
          cta:   'Open Drivers',
        },
        {
          text: 'Search the load board for freight in your driver\'s lane. Use Find Loads to spot rate benchmarks, then call brokers directly. Once you have a rate, create the load in the Loads tab and set it to Booked.',
          route: '/findloads',
          cta:   'Find Loads',
        },
      ],
    },
    {
      id:    'invoice',
      label: 'Send your first invoice',
      done:  ops.hasSentOrPaidInvoice,
      actions: [
        {
          text: ops.uninvoicedDelivered > 0
            ? `${ops.uninvoicedDelivered} delivered load${ops.uninvoicedDelivered !== 1 ? 's' : ''} without an invoice. Create the invoice right now — every day you wait is a day added to your payment wait. Broker payment terms start from the date you send it.`
            : 'The moment your driver confirms delivery, go to Invoices and create the invoice immediately. Do not wait until tomorrow. Do not wait until the end of the week.',
          route: '/invoices',
          cta:   'Open Invoices',
        },
      ],
    },
  ]

  const completedCount  = milestones.filter(m => m.done).length
  const currentMilestone = milestones.find(m => !m.done) ?? milestones[milestones.length - 1]
  const progressPct      = (completedCount / milestones.length) * 100

  return (
    <div className='bg-surface-700 rounded-xl border border-blue-600/30 shadow-card overflow-hidden'>

      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className='w-full flex items-center justify-between px-5 py-3 border-b border-surface-500/50 hover:bg-surface-600/30 transition-colors'
      >
        <div className='flex items-center gap-2.5'>
          <Rocket size={13} className='text-blue-400 shrink-0' />
          <span className='text-sm font-semibold text-gray-100'>7-Day Profitability Sprint</span>
          <span className='text-xs text-gray-500'>
            {completedCount} of {milestones.length} milestones complete
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <span className={`text-xs font-medium ${dayColor} flex items-center gap-1`}>
            {urgent && <AlertTriangle size={11} />}
            {dayLabel}
          </span>
          {collapsed
            ? <ChevronDown size={14} className='text-gray-500' />
            : <ChevronUp   size={14} className='text-gray-500' />
          }
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className='h-0.5 bg-surface-500'>
            <div
              className='h-full bg-blue-500 transition-all duration-500'
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Milestone track */}
          <div className='flex items-center gap-0 px-5 pt-4 pb-2 overflow-x-auto'>
            {milestones.map((m, i) => {
              const isCurrent = !m.done && (i === 0 || milestones[i - 1].done)
              return (
                <div key={m.id} className='flex items-center shrink-0'>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    m.done
                      ? 'text-green-700 dark:text-green-400 bg-green-500/10'
                      : isCurrent
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-500/15 ring-1 ring-blue-500/40'
                        : 'text-gray-600 bg-surface-600/50'
                  }`}>
                    {m.done
                      ? <CheckCircle2 size={12} className='shrink-0' />
                      : <Circle size={12} className='shrink-0' />
                    }
                    {m.label}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`w-6 h-px mx-1 ${milestones[i].done ? 'bg-green-500/40' : 'bg-surface-500'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current milestone actions */}
          <div className='px-5 pb-4 pt-2 space-y-2.5'>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>
              Current focus: {currentMilestone.label}
            </p>
            {currentMilestone.actions.map((action, i) => (
              <div
                key={i}
                className='flex items-start justify-between gap-4 p-3 rounded-lg bg-surface-600/50 border border-surface-500/50'
              >
                <p className='text-sm text-gray-300 leading-relaxed flex-1'>{action.text}</p>
                <button
                  onClick={() => navigate(action.route)}
                  className='shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap'
                >
                  {action.cta} <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
