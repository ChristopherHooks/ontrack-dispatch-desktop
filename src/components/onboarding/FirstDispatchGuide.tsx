import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, X, Truck, Phone, Package,
  FileText, DollarSign, MapPin, CheckCircle2, ArrowRight,
  Minimize2, ClipboardList, Search,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

// ---------------------------------------------------------------------------
// Step definitions — each step covers one phase of the first dispatch day
// ---------------------------------------------------------------------------
interface GuideStep {
  label:       string
  icon:        React.ReactNode
  title:       string
  description: string
  appSection?: { label: string; path: string }
}

const STEPS: GuideStep[] = [
  {
    label: 'Your Day',
    icon:  <Truck size={16} />,
    title: 'Here is what today looks like',
    description: [
      'You have a driver and no loads. That is normal for day one. Here is the full sequence you will run today:',
      '1. Verify your driver is completely set up and ready to run.',
      '2. Learn their lane — where they are, where they want to go, and their minimum rate per mile.',
      '3. Search for loads on DAT or the broker boards.',
      '4. Check the broker before calling — payment grade matters.',
      '5. Call the broker, negotiate, and confirm the rate.',
      '6. Book the load in OnTrack and generate the Run Sheet.',
      '7. Manage the load through pickup, transit, and delivery.',
      '8. Invoice the broker the moment delivery is confirmed.',
      'This guide walks you through each step. Use the "Go there now" buttons to open each section while keeping this guide available.',
    ].join('\n\n'),
  },
  {
    label: 'Driver Check',
    icon:  <CheckCircle2 size={16} />,
    title: 'Verify your driver is ready to run',
    description: [
      'Before you touch a load board, open your driver record and confirm everything is in order. A load booked before setup is complete can fall apart at the last minute.',
      'Check these four things:',
      '1. Dispatch agreement — signed and on file. If not, use the Agreement button in the driver record to generate and send it right now.',
      '2. Certificate of Insurance (COI) — you need this on file before any broker will dispatch your carrier.',
      '3. W-9 — required for year-end 1099 reporting. Get it now, not in December.',
      '4. Broker packets — at least two or three brokers should have your carrier approved. Without broker approval, you cannot book a load with that broker.',
      'If anything is missing, stop here and get it resolved. The load board will still be there in an hour.',
    ].join('\n\n'),
    appSection: { label: 'Open Drivers', path: '/drivers' },
  },
  {
    label: 'Know the Lane',
    icon:  <MapPin size={16} />,
    title: 'Know your driver before you search',
    description: [
      'Call or text your driver before opening the load board. You need four things from them:',
      '1. Current location — city and state. This is your search origin.',
      '2. Where they want to go — not just a preference but a real direction. Northeast, Southeast, Midwest? Narrow it down.',
      '3. Minimum RPM — their floor rate per mile. Get a hard number. "At least $2.50" is usable. "Something good" is not.',
      '4. Equipment details and restrictions — trailer type, length, lift gate, oversize authority (if any), and anything they will not haul.',
      'Write these down. You will use every one of them on the next call.',
      'For a flatbed driver based in Florida, strong outbound lanes are FL to TX, FL to GA, FL to NC, and FL to the Midwest. Inbound Florida is soft — position them to get out on a good rate.',
    ].join('\n\n'),
  },
  {
    label: 'Find a Load',
    icon:  <Search size={16} />,
    title: 'Search the load board',
    description: [
      'Open DAT (or whatever board your carrier is approved on). Set your search to:',
      'Origin: driver current city or within 50 miles. Equipment: their trailer type. Destination: open or the lane they prefer.',
      'What to look for first:',
      '1. Rate per mile — filter to show loads at or above their minimum RPM. Anything below is not worth the call.',
      '2. Miles — a 400-mile load at $2.60 RPM pays $1,040 gross. Know the math before you call.',
      '3. Pickup window — does it work with where the driver is and when they are available?',
      '4. Broker name — note it. You will check their payment history next.',
      'Screenshot or note 3 to 5 viable loads. Do not call on just one. Have backups ready because your first choice may already be covered.',
      'OnTrack\'s Find Loads page gives you a quick lane and rate reference directly in the app.',
    ].join('\n\n'),
    appSection: { label: 'Open Find Loads', path: '/findloads' },
  },
  {
    label: 'Check Broker',
    icon:  <ClipboardList size={16} />,
    title: 'Check the broker before you call',
    description: [
      'Never call a broker cold without checking their payment history first. A load that pays Net 120 or has an F payment grade will hurt your cash flow for months.',
      'In OnTrack, open the Brokers tab and find the broker offering the load. Look at:',
      '1. Payment Grade — A or B is solid. C is borderline. D or F means they are slow payers or problematic. Avoid on a first load if possible.',
      '2. Payment Terms — Net 30 is standard. Net 60 is long but manageable. Anything beyond 60 days, ask why.',
      '3. Contact Log — if you have called them before, your notes are here.',
      'If the broker is not in your list yet, add them now with the basic info. You can fill in payment history after the first invoice clears.',
      'If the broker looks good, move on. If not, go back to your load list and pick a different broker.',
    ].join('\n\n'),
    appSection: { label: 'Open Brokers', path: '/brokers' },
  },
  {
    label: 'Make the Call',
    icon:  <Phone size={16} />,
    title: 'Call the broker and negotiate',
    description: [
      'Have this ready before you dial: driver location, equipment type, trailer dimensions, pickup availability, and your target rate.',
      'The call goes like this:',
      '"Hi, this is [your name] with [company name]. I have a [trailer type] available in [city, state] for pickup [date]. I\'m calling on your load from [origin] to [destination] listed at [posted rate]. Is that still available?"',
      'If it is available, counter above the posted rate by 5 to 10 percent. Brokers post low. You can almost always get more on the first ask.',
      'Confirm these three things before hanging up:',
      '1. Final rate — get them to say the number out loud.',
      '2. Pickup number or reference — you need this for the load entry.',
      '3. Whether your carrier is approved — if not, get the packet submission email right now.',
      'After the call, log it in the broker\'s Contact Log in OnTrack so you have a record of the agreed rate and who you spoke with.',
    ].join('\n\n'),
    appSection: { label: 'Open Brokers', path: '/brokers' },
  },
  {
    label: 'Book It',
    icon:  <Package size={16} />,
    title: 'Create the load and send the Run Sheet',
    description: [
      'Once you have a confirmed rate, enter the load in OnTrack immediately. Do not wait. Details fade fast.',
      'Fill in: broker, driver, rate, fuel surcharge (if any), origin city and state, destination city and state, pickup date, estimated miles, and any load reference number or pickup number from the broker.',
      'Set status to Booked.',
      'Then open the load and click Run Sheet. This generates a one-page document with all the load details your driver needs: pickup address, delivery address, broker contact, rate, and special instructions.',
      'Send the Run Sheet to your driver by text or email. This is their authorization to pick up the load. Never send a driver to a pickup without it.',
      'From this point forward, every update to the load (status changes, check calls, delivery confirmation) happens in this load record.',
    ].join('\n\n'),
    appSection: { label: 'Open Loads', path: '/loads' },
  },
  {
    label: 'In Transit',
    icon:  <Truck size={16} />,
    title: 'Manage the load while it is moving',
    description: [
      'Your job does not end when the driver leaves for pickup. Active load management is what separates a good dispatcher from a bad one.',
      'Status updates — keep the load record current:',
      'Picked Up: when driver calls to confirm they have the load on the trailer.',
      'In Transit: when they are on the road headed to delivery.',
      'Delivered: the moment they confirm delivery.',
      'Check calls — touch base with your driver at least once mid-route. Log it in the load\'s Check Call section with a note. Brokers occasionally ask for check call history.',
      'If anything goes wrong — a breakdown, a delay, a delivery appointment change — call the broker before they call you. Every time. Proactive communication keeps the relationship intact even when things go sideways.',
      'The Active Loads page gives you a real-time view of everything moving.',
    ].join('\n\n'),
    appSection: { label: 'Open Active Loads', path: '/activeloads' },
  },
  {
    label: 'Get Paid',
    icon:  <DollarSign size={16} />,
    title: 'Invoice immediately after delivery',
    description: [
      'The moment your driver confirms delivery, create the invoice. Not tomorrow. Not after lunch. Right now.',
      'Broker payment terms start from the date you send the invoice. Every day you wait is a day added to the time you are waiting for money.',
      'In OnTrack: go to Invoices, click New Invoice, link it to the load. The driver gross and your dispatch fee calculate automatically from the rate and your dispatch percentage.',
      'Set status to Sent. Record today as the sent date.',
      'Most brokers require a signed POD (proof of delivery) with the invoice. Ask your driver to send you the signed BOL photo before the end of the day.',
      'Mark the invoice Paid when the check or ACH clears. OnTrack will flag it as Overdue if it passes the broker\'s payment terms — that is your trigger to follow up.',
      'That is the full cycle. Repeat it. The only difference from here on is that you do it with more loads, more drivers, and better rates as you build your reputation with brokers.',
    ].join('\n\n'),
    appSection: { label: 'Open Invoices', path: '/invoices' },
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FirstDispatchGuide() {
  const navigate = useNavigate()
  const {
    setFirstDispatchComplete,
    firstDispatchGuideMinimized,
    setFirstDispatchGuideMinimized,
  } = useSettingsStore()

  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const progress = step / (STEPS.length - 1)

  const next = async () => {
    if (isLast) {
      await setFirstDispatchComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const goThere = () => {
    if (current.appSection) {
      setFirstDispatchGuideMinimized(true)
      navigate(current.appSection.path)
    }
  }

  // ── Minimized floating badge ─────────────────────────────────────────────
  if (firstDispatchGuideMinimized) {
    return (
      <button
        onClick={() => setFirstDispatchGuideMinimized(false)}
        className='fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-2.5 bg-surface-700 border border-blue-600/50 rounded-full shadow-2xl text-sm font-medium text-blue-400 hover:bg-surface-600 transition-colors group'
      >
        <div className='w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0'>
          <span className='text-white text-2xs font-bold'>{step + 1}</span>
        </div>
        Day 1 Guide — {current.label}
        <ChevronRight size={14} className='group-hover:translate-x-0.5 transition-transform' />
      </button>
    )
  }

  // ── Full guide ───────────────────────────────────────────────────────────
  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm'>
      <div className='w-full max-w-xl mx-4 bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl flex flex-col overflow-hidden'>

        {/* Progress bar */}
        <div className='h-1 bg-surface-600'>
          <div
            className='h-full bg-blue-500 transition-all duration-300'
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-500 shrink-0'>
          <div className='flex items-center gap-2'>
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition-colors ${
                  i < step    ? 'bg-green-500'
                  : i === step ? 'bg-blue-500'
                  : 'bg-surface-500'
                }`}
              />
            ))}
          </div>
          <div className='flex items-center gap-1'>
            <span className='text-xs text-gray-600 mr-2'>Step {step + 1} of {STEPS.length}</span>
            <button
              onClick={() => setFirstDispatchGuideMinimized(true)}
              className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-600 hover:text-gray-300 transition-colors'
              title='Minimize guide'
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={() => setFirstDispatchComplete()}
              className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-600 hover:text-gray-400 transition-colors'
              title='Dismiss guide'
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 px-6 py-5 overflow-y-auto max-h-[65vh]'>
          <div className='flex items-center gap-2 mb-3'>
            <span className='text-blue-400'>{current.icon}</span>
            <h2 className='text-lg font-bold text-white'>{current.title}</h2>
          </div>

          <div className='space-y-3'>
            {current.description.split('\n\n').map((para, i) => (
              <p key={i} className='text-sm text-gray-300 leading-relaxed'>{para}</p>
            ))}
          </div>

          {current.appSection && (
            <button
              onClick={goThere}
              className='mt-5 flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/40 hover:border-blue-500 rounded-xl text-sm font-medium text-blue-400 transition-all group'
            >
              <ArrowRight size={15} className='group-hover:translate-x-0.5 transition-transform' />
              {current.appSection.label}
              <span className='text-xs text-blue-600 ml-1'>— guide minimizes so you can work</span>
            </button>
          )}

          {/* Final step — quick links */}
          {isLast && (
            <div className='mt-5 grid grid-cols-2 gap-2'>
              {[
                { label: 'Operations',   path: '/operations',  desc: 'Your daily dashboard' },
                { label: 'Loads',        path: '/loads',       desc: 'All loads at a glance' },
                { label: 'Invoices',     path: '/invoices',    desc: 'Track what you are owed' },
                { label: 'Active Loads', path: '/activeloads', desc: 'Real-time load status' },
              ].map(({ label, path, desc }) => (
                <button
                  key={path}
                  onClick={() => { setFirstDispatchComplete(); navigate(path) }}
                  className='flex flex-col items-start p-3 rounded-xl border border-surface-500 bg-surface-700 hover:border-blue-600/50 hover:bg-blue-600/10 transition-all text-left group'
                >
                  <span className='text-sm font-medium text-gray-100 group-hover:text-blue-400 transition-colors'>{label}</span>
                  <span className='text-2xs text-gray-500 mt-0.5'>{desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between px-6 py-4 border-t border-surface-500 shrink-0'>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className='flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
          >
            <ChevronLeft size={15} /> Back
          </button>

          <div className='flex items-center gap-2'>
            {!isLast && (
              <button
                onClick={next}
                className='text-xs text-gray-600 hover:text-gray-400 px-3 py-1.5 transition-colors'
              >
                Skip for now
              </button>
            )}
            <button
              onClick={next}
              className='flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors'
            >
              {isLast ? 'Start dispatching' : 'Next'}
              {!isLast && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
