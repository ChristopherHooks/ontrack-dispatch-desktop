import { useState } from 'react'
import { HelpCircle, Search, ChevronRight, ChevronDown, Keyboard, BookOpen, PlayCircle, Phone, Copy, Check } from 'lucide-react'
import { badge as badgeTokens } from '../styles/uiTokens'
import { HELP_ARTICLES, HELP_CATEGORIES, KEYBOARD_SHORTCUTS } from '../data/helpArticles'
import type { HelpArticle } from '../data/helpArticles'
import { INDUSTRY_TERMS, TERM_CATEGORIES } from '../data/industryTerms'
import type { IndustryTerm } from '../data/industryTerms'
import { useSettingsStore } from '../store/settingsStore'

const CATEGORY_COLORS: Record<string, string> = {
  'Getting Started': badgeTokens.success,
  'Operations':      badgeTokens.warning,
  'Dispatch':        badgeTokens.caution,
  'Leads':           badgeTokens.info,
  'Drivers':         badgeTokens.purple,
  'Brokers':         badgeTokens.teal,
  'Invoices':        badgeTokens.emerald,
  'Marketing':       badgeTokens.pink,
  'Analytics':       badgeTokens.sky,
  'Backup & Data':   badgeTokens.neutral,
}

const TERM_CATEGORY_COLORS: Record<string, string> = {
  'Documents':       badgeTokens.info,
  'Equipment':       badgeTokens.warning,
  'Regulatory':      badgeTokens.danger,
  'Dispatch':        badgeTokens.purple,
  'Rates & Freight': badgeTokens.success,
  'Business':        badgeTokens.teal,
}

type HelpTab = 'articles' | 'glossary' | 'scripts'

export function Help() {
  const setOnboardingComplete = useSettingsStore(s => s.setOnboardingComplete)
  const [tab, setTab]         = useState<HelpTab>('articles')

  // articles state
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // glossary state
  const [termSearch, setTermSearch]     = useState('')
  const [termCategory, setTermCategory] = useState<string | null>(null)

  const filtered = HELP_ARTICLES.filter(a => {
    if (category && a.category !== category) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.tags.some(t => t.includes(q))
  })

  const filteredTerms = INDUSTRY_TERMS.filter(t => {
    if (termCategory && t.category !== termCategory) return false
    if (!termSearch.trim()) return true
    const q = termSearch.toLowerCase()
    return t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
  }).sort((a, b) => a.term.localeCompare(b.term))

  return (
    <div className='max-w-4xl space-y-6 animate-fade-in'>
      <div>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-xl font-bold text-gray-100'>Help & Reference</h1>
            <p className='text-sm text-gray-500 mt-1'>Module guides, workflows, keyboard shortcuts, and industry terminology for OnTrack Dispatch Dashboard</p>
          </div>
          <button
            onClick={() => setOnboardingComplete().then(() =>
              useSettingsStore.setState({ onboardingComplete: false })
            )}
            className='flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white border border-surface-400 hover:border-orange-600/50 bg-surface-700 hover:bg-orange-600/10 rounded-xl transition-all shrink-0'
          >
            <PlayCircle size={14} className='text-orange-400' />
            Reopen Setup Guide
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className='flex gap-1 bg-surface-700 border border-surface-400 rounded-xl p-1 w-fit'>
        <button
          onClick={() => setTab('articles')}
          className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (tab === 'articles' ? 'bg-orange-600/20 text-orange-800 dark:text-orange-400 border border-orange-600/40' : 'text-gray-400 hover:text-gray-200 border border-transparent')}>
          <HelpCircle size={14} />
          Articles
        </button>
        <button
          onClick={() => setTab('glossary')}
          className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (tab === 'glossary' ? 'bg-orange-600/20 text-orange-800 dark:text-orange-400 border border-orange-600/40' : 'text-gray-400 hover:text-gray-200 border border-transparent')}>
          <BookOpen size={14} />
          Glossary
        </button>
        <button
          onClick={() => setTab('scripts')}
          className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (tab === 'scripts' ? 'bg-orange-600/20 text-orange-800 dark:text-orange-400 border border-orange-600/40' : 'text-gray-400 hover:text-gray-200 border border-transparent')}>
          <Phone size={14} />
          Call Scripts
        </button>
      </div>

      {tab === 'articles' && (
        <>
          {/* Search */}
          <div className='relative'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500' />
            <input type='text' placeholder='Search articles...' value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-surface-700 border border-surface-400 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/60' />
          </div>

          {/* Category pills */}
          <div className='flex flex-wrap gap-2'>
            <button onClick={() => setCategory(null)}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
                (!category ? 'bg-orange-600/20 border-orange-600 text-orange-800 dark:text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
              All Topics
            </button>
            {HELP_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(c => c === cat ? null : cat)}
                className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
                  (category === cat ? 'bg-orange-600/20 border-orange-600 text-orange-800 dark:text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
                {cat}
              </button>
            ))}
          </div>

          {/* Articles */}
          <div className='space-y-3'>
            {filtered.length === 0 ? (
              <div className='bg-surface-700 rounded-xl border border-surface-400 p-8 text-center'>
                <HelpCircle size={32} className='text-gray-700 mx-auto mb-2' />
                <p className='text-sm text-gray-500'>No articles match your search.</p>
              </div>
            ) : filtered.map(article => (
              <ArticleCard key={article.id} article={article}
                expanded={expanded === article.id}
                onToggle={() => setExpanded(e => e === article.id ? null : article.id)} />
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className='bg-surface-700 rounded-xl border border-surface-400 p-5'>
            <div className='flex items-center gap-2 mb-4 pb-3 border-b border-surface-400'>
              <Keyboard size={15} className='text-orange-500' />
              <h2 className='text-sm font-semibold text-gray-200'>Keyboard Shortcuts</h2>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {KEYBOARD_SHORTCUTS.map((s, i) => (
                <div key={i} className='flex items-center justify-between py-1.5 px-3 bg-surface-600 rounded-lg'>
                  <span className='text-xs text-gray-400'>{s.description}</span>
                  <div className='flex items-center gap-1'>
                    {s.keys.map((k, ki) => (
                      <span key={ki} className='px-1.5 py-0.5 bg-surface-500 border border-surface-300 rounded text-2xs text-gray-300 font-mono'>{k}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'glossary' && (
        <>
          {/* Glossary search */}
          <div className='relative'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500' />
            <input type='text' placeholder='Search terms, acronyms, definitions...' value={termSearch}
              onChange={e => setTermSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-surface-700 border border-surface-400 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-600/60' />
          </div>

          {/* Category filter */}
          <div className='flex flex-wrap gap-2'>
            <button onClick={() => setTermCategory(null)}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
                (!termCategory ? 'bg-orange-600/20 border-orange-600 text-orange-800 dark:text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
              All Categories
            </button>
            {TERM_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setTermCategory(c => c === cat ? null : cat)}
                className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
                  (termCategory === cat ? 'bg-orange-600/20 border-orange-600 text-orange-800 dark:text-orange-400' : 'bg-surface-700 border-surface-400 text-gray-400 hover:text-gray-200')}>
                {cat}
              </button>
            ))}
          </div>

          {/* Result count */}
          <p className='text-xs text-gray-500'>{filteredTerms.length} term{filteredTerms.length !== 1 ? 's' : ''}</p>

          {/* Terms list */}
          {filteredTerms.length === 0 ? (
            <div className='bg-surface-700 rounded-xl border border-surface-400 p-8 text-center'>
              <BookOpen size={32} className='text-gray-700 mx-auto mb-2' />
              <p className='text-sm text-gray-500'>No terms match your search.</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredTerms.map(term => (
                <TermCard key={term.term} term={term} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Call Scripts ─────────────────────────────────────────────────── */}
      {tab === 'scripts' && <CallScriptsPanel />}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Call Scripts Panel
// ---------------------------------------------------------------------------

interface Script {
  id:       string
  title:    string
  context:  string
  script:   string
}

const CALL_SCRIPTS: Script[] = [
  {
    id: 'broker-first-contact',
    title: 'First Call to a New Broker',
    context: 'Use this when you call a broker to introduce yourself and get set up as an approved carrier. Have your carrier\'s MC number, DOT number, and COI ready before calling.',
    script: `"Hi, my name is [YOUR NAME] with [COMPANY NAME]. I am a freight dispatcher and I have a carrier I would like to get set up with you.

Can I get the email address for your carrier setup department?

[WAIT FOR ANSWER]

The carrier runs [EQUIPMENT TYPE] out of [HOME STATE]. Their MC number is [MC NUMBER]. I will send over their carrier packet — that includes their authority documents, certificate of insurance, and W-9.

What is your typical approval timeline once you receive the packet?

[WAIT FOR ANSWER]

Great. Once we are approved, what is your best number to call when I have a carrier available for a load?

[GET DIRECT LINE / EXTENSION]

Thank you. I will get that packet over to you today."`,
  },
  {
    id: 'rate-negotiation',
    title: 'Negotiating a Load Rate',
    context: 'Use this when you call a broker about a load you found on the board. Check the DAT rate for the lane before calling so you know the market. The posted rate is rarely the final rate — always counter.',
    script: `"Hi, I am calling about load [LOAD REFERENCE NUMBER] from [ORIGIN] to [DESTINATION] on [DATE].

Is that still available?

[IF YES:]

I have a [EQUIPMENT TYPE] that can cover it. What is the all-in rate you have posted?

[BROKER GIVES RATE]

I appreciate that. DAT is showing the average on this lane at [$X.XX] per mile. My carrier is looking for [$X.XX] all-in to make the numbers work. Can you work with that?

[IF THEY PUSH BACK:]

I understand. Is there any flexibility at all? My carrier is clean, we will have POD and BOL to you within 24 hours of delivery, and we have never had a chargeback. That reliability has value.

[IF STILL NO:]

I get it. If anything changes on your end or you need a carrier for a similar lane in the future, please keep me in mind. My number is [PHONE NUMBER]."`,
  },
  {
    id: 'load-status',
    title: 'Calling a Broker for Load Status',
    context: 'Use this when a broker is asking for an update on a load in transit, or when you need to report a delay. Keep it brief and factual.',
    script: `"Hi, this is [YOUR NAME] with [COMPANY NAME] calling about load [REFERENCE NUMBER].

I wanted to give you an update. The driver is currently [LOCATION / STATUS]. [He / She] is on track for [ESTIMATED DELIVERY TIME / DATE].

[IF THERE IS A DELAY:]

I do need to let you know we are running approximately [X HOURS] behind schedule due to [BRIEF REASON — traffic, weather, mechanical]. I wanted to give you and the receiver as much notice as possible. Can you please notify the delivery location?

[IF DETENTION IS INVOLVED:]

Also, the driver has been detained at the shipper since [TIME]. We are going to need to put in a detention claim. I will send that over to you in writing with the timestamps. Who should I address that to?"`,
  },
  {
    id: 'invoice-followup',
    title: 'Following Up on a Late Invoice',
    context: 'Use this when a broker has not paid within their stated payment terms. Keep the tone professional — assume it is an administrative issue first, not deliberate non-payment.',
    script: `"Hi, this is [YOUR NAME] with [COMPANY NAME]. I am following up on invoice number [INVOICE NUMBER] for load [REFERENCE NUMBER] that we completed on [DELIVERY DATE].

Per the rate confirmation, payment was due by [DUE DATE]. I wanted to check on the status.

[IF THEY SAY IT IS PROCESSING:]

Thank you for checking. Can you give me a rough timeline on when I should expect to see it? I want to make sure we get this resolved this week.

[IF THEY SAY MISSING DOCUMENTS:]

I will resend the invoice, BOL, and POD to [EMAIL] right now while I have you on the phone. Can you confirm that address?

[IF THEY BECOME EVASIVE:]

I understand. I do need to let you know that if this is not resolved by [DATE — 5 business days out], I will need to escalate this through the proper channels. I am hopeful we can avoid that. What is the best next step on your end?"`,
  },
  {
    id: 'carrier-recruitment',
    title: 'Cold Call to an Owner-Operator',
    context: 'Use this when you call a driver directly after seeing their truck number posted in a group or getting a referral. Keep it short — most drivers screen calls.',
    script: `"Hey, is this [NAME]? My name is [YOUR NAME] — I am a dispatcher out of [YOUR STATE].

I have been looking for a [EQUIPMENT TYPE] operator and your name came up. Do you have about two minutes?

[IF YES:]

I dispatch for a small group of owner-operators. I handle the load board work, the broker calls, and the rate negotiations. You drive, I handle the freight side. I charge [X]% per load, no monthly fees.

Right now I have freight available in your area. What lanes are you currently running?

[LISTEN — let them talk about their lanes and equipment]

That is exactly what I have been booking. The rates I have been pulling on those lanes are [RANGE]. Does that match what you have been seeing?

[LISTEN]

I would love to set up a quick call this week to walk you through exactly how I work. No commitment — just a conversation. What day works for you?"`,
  },
]

function CallScriptsPanel() {
  const [expanded, setExpanded] = useState<string | null>(CALL_SCRIPTS[0]?.id ?? null)
  const [copied,   setCopied]   = useState<string | null>(null)

  const handleCopy = async (script: Script) => {
    await navigator.clipboard.writeText(script.script)
    setCopied(script.id)
    setTimeout(() => setCopied(null), 2500)
  }

  return (
    <div className='space-y-4'>
      <div>
        <p className='text-sm text-gray-400'>
          Ready-to-use phone scripts for the most common calls in freight dispatch.
          Customize the bracketed fields before each call. Copy the script and read from it until the language feels natural.
        </p>
      </div>
      <div className='space-y-3'>
        {CALL_SCRIPTS.map(s => (
          <div key={s.id} className='bg-surface-700 rounded-xl border border-surface-400 overflow-hidden'>
            <button
              onClick={() => setExpanded(e => e === s.id ? null : s.id)}
              className='w-full flex items-center justify-between px-5 py-4 hover:bg-surface-600 transition-colors text-left'
            >
              <div className='flex items-center gap-3'>
                <Phone size={14} className='text-orange-400 shrink-0' />
                <div>
                  <p className='text-sm font-semibold text-gray-200'>{s.title}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{s.context.slice(0, 80)}...</p>
                </div>
              </div>
              <ChevronDown size={14} className={`text-gray-600 transition-transform shrink-0 ml-3 ${expanded === s.id ? 'rotate-180' : ''}`} />
            </button>
            {expanded === s.id && (
              <div className='border-t border-surface-500'>
                <div className='px-5 py-3 bg-surface-700/50'>
                  <p className='text-xs text-gray-400 leading-relaxed'>{s.context}</p>
                </div>
                <div className='relative'>
                  <pre className='px-5 py-4 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-surface-600/50 overflow-x-auto'>
                    {s.script}
                  </pre>
                  <button
                    onClick={() => handleCopy(s)}
                    className='absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-700 hover:bg-surface-500 border border-surface-400 text-gray-300 rounded-lg transition-colors'
                  >
                    {copied === s.id ? <Check size={12} className='text-green-400' /> : <Copy size={12} />}
                    {copied === s.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ArticleCard({ article, expanded, onToggle }: { article: HelpArticle; expanded: boolean; onToggle: () => void }) {
  const cc = CATEGORY_COLORS[article.category] ?? 'bg-surface-600 text-gray-400 border-surface-400'
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 overflow-hidden shadow-card'>
      <button onClick={onToggle}
        className='w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-600/30 transition-colors'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className={'text-2xs px-1.5 py-0.5 rounded border ' + cc}>{article.category}</span>
          </div>
          <h3 className='text-sm font-semibold text-gray-200'>{article.title}</h3>
          <p className='text-xs text-gray-400 mt-0.5'>{article.summary}</p>
        </div>
        {expanded ? <ChevronDown size={15} className='text-gray-500 shrink-0'/> : <ChevronRight size={15} className='text-gray-500 shrink-0'/>}
      </button>
      {expanded && (
        <div className='px-6 pb-5 pt-2 border-t border-surface-400'>
          <div className='prose-sm text-gray-300 space-y-2 whitespace-pre-wrap text-sm leading-relaxed'>
            {article.content.trim().split(String.fromCharCode(10)).map((line, i) => {
              if (line.startsWith('### ')) return <h4 key={i} className='text-sm font-semibold text-gray-200 mt-3 mb-1'>{line.slice(4)}</h4>
              if (line.startsWith('## '))  return <h3 key={i} className='text-base font-bold text-gray-100 mt-4 mb-1'>{line.slice(3)}</h3>
              if (line.startsWith('# '))   return <h2 key={i} className='text-lg font-bold text-white mt-4 mb-2'>{line.slice(2)}</h2>
              if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className='flex gap-2 ml-2 text-sm'><span className='text-orange-500 shrink-0 mt-0.5'>&#8226;</span><span>{line.slice(2)}</span></div>
              if (line.startsWith('> '))   return <blockquote key={i} className='border-l-2 border-orange-600 pl-3 text-gray-400 italic text-sm'>{line.slice(2)}</blockquote>
              if (!line.trim())            return <div key={i} className='h-1' />
              return <p key={i} className='text-sm text-gray-300'>{line}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TermCard({ term }: { term: IndustryTerm }) {
  const cc = TERM_CATEGORY_COLORS[term.category] ?? 'bg-surface-600 text-gray-400 border-surface-400'
  return (
    <div className='bg-surface-700 rounded-xl border border-surface-400 px-5 py-4'>
      <div className='flex items-start gap-3'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1.5 flex-wrap'>
            <span className='text-sm font-semibold text-gray-200'>{term.term}</span>
            <span className={'text-2xs px-1.5 py-0.5 rounded border shrink-0 ' + cc}>{term.category}</span>
          </div>
          <p className='text-sm text-gray-400 leading-relaxed'>{term.definition}</p>
        </div>
      </div>
    </div>
  )
}
