import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, X, Truck, Building2, Users, Package,
  DollarSign, Megaphone, FileText, Minimize2, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

// ---------------------------------------------------------------------------
// Step definitions — each step teaches a specific app feature
// ---------------------------------------------------------------------------
interface WizardStep {
  label:       string
  icon:        React.ReactNode
  title:       string
  description: string
  appSection?: {        // If set, shows a "Go there now" button
    label: string
    path:  string
  }
  inlineAction?: 'company-info' | 'seed-brokers'   // Rendered inline
}

const STEPS: WizardStep[] = [
  {
    label: 'Welcome',
    icon:  <Truck size={16} />,
    title: 'Welcome to OnTrack',
    description: [
      'OnTrack manages your entire dispatch operation from one place. Before you can make money, you need to do five things in order:',
      '1. Fill in your company info so documents and invoices look professional.',
      '2. Add the freight brokers your carriers will work with.',
      '3. Post recruitment ads in Facebook groups to find carrier leads.',
      '4. Convert an interested carrier into a Driver and complete their setup.',
      '5. Find a load, book it, deliver it, and invoice the broker.',
      'This guide walks you through each step in the software. Use the "Go there now" buttons to open each section, then come back here to continue.',
    ].join('\n\n'),
  },
  {
    label: 'Your Info',
    icon:  <Building2 size={16} />,
    title: 'Fill in your company info',
    description: 'Your company name appears on invoices, the post generator, and dispatch agreements. Fill this in now so everything looks professional from day one.',
    inlineAction: 'company-info',
  },
  {
    label: 'Brokers',
    icon:  <Building2 size={16} />,
    title: 'Add freight brokers',
    description: 'Brokers are the companies that have freight and pay carriers to move it. Your carriers cannot run loads until they are approved with brokers.\n\nThe Brokers tab in OnTrack is where you track which brokers your carriers are set up with, how fast they pay, and any issues to flag.\n\nClick "Add Starter Brokers" on the Brokers page to load 20 established brokers instantly — names, payment terms, and authority policies are pre-filled. Then you can open each one and add the carrier packet submission contact.',
    appSection: { label: 'Open Brokers', path: '/brokers' },
  },
  {
    label: 'Marketing',
    icon:  <Megaphone size={16} />,
    title: 'Post to find carriers',
    description: 'The fastest way to find your first carrier is Facebook trucking groups. OnTrack\'s Marketing tab generates ready-to-post ads for you — you just copy and paste.\n\nHere\'s how to use it:\n1. Open the Marketing tab.\n2. The post generator shows today\'s suggested post on the left. Click "Copy" to copy it.\n3. Paste it into a Facebook trucking group.\n4. When someone replies, come back and add them as a Lead.\n\nPost every day for the first two weeks. Consistency is what fills your lead pipeline.',
    appSection: { label: 'Open Marketing', path: '/marketing' },
  },
  {
    label: 'Leads',
    icon:  <Users size={16} />,
    title: 'Track incoming drivers',
    description: 'When an owner-operator responds to your posts or reaches out directly, add them as a Lead immediately. Leads let you track who you are in conversation with before they sign.\n\nHere\'s how:\n1. Open the Leads tab.\n2. Click "Add Lead" and fill in their name, equipment type, and home state.\n3. Use the Lead status to track where they are: New → Contacted → Warm → Agreement Sent → Signed.\n4. Once they have signed your dispatch agreement and you have their COI and W-9, click "Convert to Driver."\n\nThe lead pipeline is your early-stage roster. Work it every day.',
    appSection: { label: 'Open Leads', path: '/leads' },
  },
  {
    label: 'Drivers',
    icon:  <Truck size={16} />,
    title: 'Onboard your first driver',
    description: 'Once a carrier signs and you have their paperwork, converting them to a Driver in OnTrack sets them up for active dispatch.\n\nHere\'s what happens when you open a Driver record:\n1. The "Agreement" button generates a pre-filled dispatch service agreement you can send instantly.\n2. The "Carrier Setup" checklist tracks what you still need: COI, W-9, broker packets, RMIS verification.\n3. You can attach their actual documents to their record for reference.\n\nDo not book a load until their setup checklist is complete. Moving freight without a signed agreement or valid COI is a real liability.',
    appSection: { label: 'Open Drivers', path: '/drivers' },
  },
  {
    label: 'Loads',
    icon:  <Package size={16} />,
    title: 'Find and book your first load',
    description: 'Once your carrier is set up with brokers, you can start searching for freight.\n\nTwo tools in OnTrack help with this:\n\nFind Loads — a quick search interface where you enter the lane and equipment type to see what is on the board. Use this to spot-check rates before calling brokers.\n\nLoad Match — matches available drivers to open load opportunities based on location and equipment.\n\nWhen you book a load, add it to the Loads tab with the pickup, delivery, rate, and broker. This feeds your invoicing and dispatcher board.',
    appSection: { label: 'Open Find Loads', path: '/findloads' },
  },
  {
    label: 'Invoices',
    icon:  <FileText size={16} />,
    title: 'Invoice and get paid',
    description: 'After delivery is confirmed, the invoice goes to the broker immediately. Do not wait.\n\nIn OnTrack:\n1. Go to Invoices and click "New Invoice."\n2. Link it to the load, set the driver gross, and your dispatch fee calculates automatically at your rate.\n3. Set the status to "Sent" and record the sent date.\n4. When the broker pays, mark it "Paid" and record the date.\n\nThe Operations dashboard tracks your revenue month-to-date. The Invoices page flags anything overdue so nothing falls through the cracks.',
    appSection: { label: 'Open Invoices', path: '/invoices' },
  },
  {
    label: 'Ready',
    icon:  <DollarSign size={16} />,
    title: 'You are set up',
    description: 'That is the full workflow: brokers set up, carrier recruited, load booked, invoice sent, money collected.\n\nA few things to do right now:\n\nCheck Operations daily — it shows your revenue, active loads, expiring docs, and anything that needs attention.\n\nPost in Facebook groups every day for at least two weeks. Volume of outreach directly determines how fast you find carriers.\n\nThe Dispatcher Board (real-time view of active loads) and Analytics (longer-term trends) are worth exploring once you have a few loads moving.\n\nYou can reopen this guide any time from the Help page.',
  },
]

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export function OnboardingWizard() {
  const navigate = useNavigate()
  const {
    companyName, ownerName, ownerEmail, ownerPhone, defaultDispatchPct,
    persistSetting, setOnboardingComplete, wizardMinimized, setWizardMinimized,
  } = useSettingsStore()

  const [step, setStep] = useState(0)

  // Company info form state
  const [form, setForm] = useState({
    companyName:        companyName  || '',
    ownerName:          ownerName    || '',
    ownerEmail:         ownerEmail   || '',
    ownerPhone:         ownerPhone   || '',
    defaultDispatchPct: defaultDispatchPct || 7,
  })

  const saveInfo = async () => {
    await persistSetting('companyName',        form.companyName.trim())
    await persistSetting('ownerName',          form.ownerName.trim())
    await persistSetting('ownerEmail',         form.ownerEmail.trim())
    await persistSetting('ownerPhone',         form.ownerPhone.trim())
    await persistSetting('defaultDispatchPct', Number(form.defaultDispatchPct))
    useSettingsStore.setState({
      companyName:        form.companyName.trim(),
      ownerName:          form.ownerName.trim(),
      ownerEmail:         form.ownerEmail.trim(),
      ownerPhone:         form.ownerPhone.trim(),
      defaultDispatchPct: Number(form.defaultDispatchPct),
    })
  }

  const next = async () => {
    if (current.inlineAction === 'company-info') await saveInfo()
    if (step === STEPS.length - 1) {
      await setOnboardingComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const goThere = () => {
    if (current.appSection) {
      setWizardMinimized(true)
      navigate(current.appSection.path)
    }
  }

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const progress = step / (STEPS.length - 1)

  // ── Minimized floating badge ─────────────────────────────────────────────
  if (wizardMinimized) {
    return (
      <button
        onClick={() => setWizardMinimized(false)}
        className='fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-2.5 bg-surface-700 border border-orange-600/50 rounded-full shadow-2xl text-sm font-medium text-orange-400 hover:bg-surface-600 transition-colors group'
      >
        <div className='w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center shrink-0'>
          <span className='text-white text-2xs font-bold'>{step + 1}</span>
        </div>
        Setup Guide — {current.label}
        <ChevronRight size={14} className='group-hover:translate-x-0.5 transition-transform' />
      </button>
    )
  }

  // ── Full wizard ──────────────────────────────────────────────────────────
  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm'>
      <div className='w-full max-w-xl mx-4 bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl flex flex-col overflow-hidden'>

        {/* Progress bar */}
        <div className='h-1 bg-surface-600'>
          <div
            className='h-full bg-orange-500 transition-all duration-300'
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-500 shrink-0'>
          <div className='flex items-center gap-2'>
            {/* Step pills (compact) */}
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition-colors ${
                  i < step  ? 'bg-green-500'
                  : i === step ? 'bg-orange-500'
                  : 'bg-surface-500'
                }`}
              />
            ))}
          </div>
          <div className='flex items-center gap-1'>
            <span className='text-xs text-gray-600 mr-2'>Step {step + 1} of {STEPS.length}</span>
            <button
              onClick={() => setWizardMinimized(true)}
              className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-600 hover:text-gray-300 transition-colors'
              title='Minimize guide'
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={() => setOnboardingComplete()}
              className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-600 hover:text-gray-400 transition-colors'
              title='Exit guide (you can reopen from Help)'
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 px-6 py-5 overflow-y-auto max-h-[65vh]'>
          <div className='flex items-center gap-2 mb-3'>
            <span className='text-orange-400'>{current.icon}</span>
            <h2 className='text-lg font-bold text-white'>{current.title}</h2>
          </div>

          {/* Description — rendered as paragraphs on newline */}
          <div className='space-y-3'>
            {current.description.split('\n\n').map((para, i) => (
              <p key={i} className='text-sm text-gray-300 leading-relaxed'>{para}</p>
            ))}
          </div>

          {/* Inline: company info form */}
          {current.inlineAction === 'company-info' && (
            <div className='mt-5 space-y-3'>
              {[
                { key: 'companyName',        label: 'Company Name',           hint: 'The name you operate under' },
                { key: 'ownerName',           label: 'Your Name',              hint: '' },
                { key: 'ownerEmail',          label: 'Email',                  hint: '' },
                { key: 'ownerPhone',          label: 'Phone',                  hint: '' },
                { key: 'defaultDispatchPct',  label: 'Dispatch Fee (%)',        hint: 'Industry standard is 7-10%' },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label className='block text-xs font-medium text-gray-400 mb-1'>{label}</label>
                  <input
                    type={key === 'defaultDispatchPct' ? 'number' : 'text'}
                    value={String(form[key as keyof typeof form])}
                    onChange={e => setForm(f => ({
                      ...f,
                      [key]: key === 'defaultDispatchPct' ? Number(e.target.value) : e.target.value,
                    }))}
                    className='w-full bg-surface-600 border border-surface-400 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors'
                  />
                  {hint && <p className='text-2xs text-gray-600 mt-0.5'>{hint}</p>}
                </div>
              ))}
              <p className='text-2xs text-gray-600'>This is also in Settings if you want to change anything later.</p>
            </div>
          )}

          {/* App section link */}
          {current.appSection && (
            <button
              onClick={goThere}
              className='mt-5 flex items-center gap-2 px-4 py-2.5 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/40 hover:border-orange-500 rounded-xl text-sm font-medium text-orange-400 transition-all group'
            >
              <ArrowRight size={15} className='group-hover:translate-x-0.5 transition-transform' />
              {current.appSection.label}
              <span className='text-xs text-orange-600 ml-1'>— wizard minimizes so you can explore</span>
            </button>
          )}

          {/* Ready step — quick links */}
          {isLast && (
            <div className='mt-5 grid grid-cols-2 gap-2'>
              {[
                { label: 'Operations',   path: '/operations',  desc: 'Daily KPI dashboard' },
                { label: 'Marketing',    path: '/marketing',   desc: 'Post to find carriers' },
                { label: 'Leads',        path: '/leads',       desc: 'Track incoming drivers' },
                { label: 'Dispatcher',   path: '/dispatcher',  desc: 'Active load board' },
              ].map(({ label, path, desc }) => (
                <button
                  key={path}
                  onClick={() => { setOnboardingComplete(); navigate(path) }}
                  className='flex flex-col items-start p-3 rounded-xl border border-surface-500 bg-surface-700 hover:border-orange-600/50 hover:bg-orange-600/10 transition-all text-left group'
                >
                  <span className='text-sm font-medium text-gray-100 group-hover:text-orange-400 transition-colors'>{label}</span>
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
              className='flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              {isLast ? 'Start dispatching' : current.inlineAction === 'company-info' ? 'Save & continue' : 'Next'}
              {!isLast && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
