/**
 * OutreachPerformancePanel
 * Rendered inside the Marketing > Post History tab when post log data exists.
 * Shows aggregate totals, top templates, and stale template warnings.
 * No AI. Reads from marketing_post_log via outreach:performance + outreach:summary IPC.
 */

interface PerfRow {
  template_id:   string
  uses:          number
  total_replies: number
  total_leads:   number
  score:         number
}

interface Summary {
  total_posts:        number
  total_replies:      number
  total_leads:        number
  top_template_id:    string | null
  stale_template_ids: string[]
}

interface Props {
  summary: Summary
  perf:    PerfRow[]
}

// Friendly display name: 'ot-07' → 'Template 7', 'page-post' → 'Page Post'
function templateLabel(id: string): string {
  if (id === 'page-post') return 'Page post'
  const match = id.match(/\d+/)
  return match ? 'Template ' + parseInt(match[0], 10) : id
}

function scoreColor(score: number): string {
  if (score >= 10) return 'text-green-400'
  if (score >= 4)  return 'text-yellow-400'
  if (score === 0) return 'text-gray-600'
  return 'text-gray-400'
}

export default function OutreachPerformancePanel({ summary, perf }: Props) {
  const top5    = perf.slice(0, 5)
  const bottom3 = [...perf].reverse().slice(0, 3).filter(p => p.uses >= 3)

  return (
    <div className='mt-5 space-y-4'>
      <p className='text-2xs text-gray-500 uppercase tracking-wide'>Outreach performance</p>

      {/* Totals row */}
      <div className='grid grid-cols-3 gap-3'>
        {[
          ['Posts logged', summary.total_posts],
          ['Total replies', summary.total_replies],
          ['Leads generated', summary.total_leads],
        ].map(([label, val]) => (
          <div key={label as string} className='bg-surface-600 rounded-lg border border-surface-500 p-3'>
            <p className='text-2xs text-gray-600 mb-0.5'>{label}</p>
            <p className='text-lg font-semibold text-gray-200'>{val}</p>
          </div>
        ))}
      </div>

      {/* Top performing templates */}
      {top5.length > 0 && (
        <div className='bg-surface-600 rounded-xl border border-surface-400 overflow-hidden'>
          <div className='px-4 py-2 border-b border-surface-500/50'>
            <p className='text-2xs text-gray-500 uppercase tracking-wide'>Top templates</p>
          </div>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-surface-500/30'>
                <th className='text-left py-2 px-4 text-gray-600 font-medium'>Template</th>
                <th className='text-right py-2 px-3 text-gray-600 font-medium'>Uses</th>
                <th className='text-right py-2 px-3 text-gray-600 font-medium'>Replies</th>
                <th className='text-right py-2 px-3 text-gray-600 font-medium'>Leads</th>
                <th className='text-right py-2 px-4 text-gray-600 font-medium'>Score</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-surface-500/20'>
              {top5.map(row => (
                <tr key={row.template_id} className='hover:bg-surface-500/20 transition-colors'>
                  <td className='py-2 px-4 text-gray-300'>{templateLabel(row.template_id)}</td>
                  <td className='py-2 px-3 text-right text-gray-500'>{row.uses}</td>
                  <td className='py-2 px-3 text-right text-gray-400'>{row.total_replies}</td>
                  <td className='py-2 px-3 text-right text-gray-400'>{row.total_leads}</td>
                  <td className={`py-2 px-4 text-right font-semibold ${scoreColor(row.score)}`}>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stale template warning */}
      {summary.stale_template_ids.length > 0 && (
        <div className='bg-surface-600 rounded-xl border border-amber-700/30 p-4'>
          <p className='text-xs font-semibold text-amber-400 mb-1'>
            {summary.stale_template_ids.length} stale {summary.stale_template_ids.length === 1 ? 'template' : 'templates'} — 8+ uses, zero responses
          </p>
          <p className='text-2xs text-gray-500 mb-2'>
            These templates have been sent at least 8 times and never generated a reply or lead. Consider replacing them in outreachEngine.ts during your next weekly refresh.
          </p>
          <p className='text-2xs text-gray-600'>
            {summary.stale_template_ids.map(templateLabel).join(', ')}
          </p>
        </div>
      )}

      {/* Low performers */}
      {bottom3.length > 0 && (
        <div className='bg-surface-600 rounded-xl border border-surface-400 overflow-hidden'>
          <div className='px-4 py-2 border-b border-surface-500/50'>
            <p className='text-2xs text-gray-500 uppercase tracking-wide'>Lowest performing (3+ uses)</p>
          </div>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-surface-500/30'>
                <th className='text-left py-2 px-4 text-gray-600 font-medium'>Template</th>
                <th className='text-right py-2 px-3 text-gray-600 font-medium'>Uses</th>
                <th className='text-right py-2 px-4 text-gray-600 font-medium'>Score</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-surface-500/20'>
              {bottom3.map(row => (
                <tr key={row.template_id} className='hover:bg-surface-500/20 transition-colors'>
                  <td className='py-2 px-4 text-gray-400'>{templateLabel(row.template_id)}</td>
                  <td className='py-2 px-3 text-right text-gray-500'>{row.uses}</td>
                  <td className={`py-2 px-4 text-right font-semibold ${scoreColor(row.score)}`}>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
