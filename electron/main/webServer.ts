/**
 * OnTrack Dispatch — Mobile Hot Leads Web Server
 *
 * Starts a lightweight HTTP server inside the Electron main process so that
 * Chris can open http://<PC-IP>:3001 on his phone (same Wi-Fi) to:
 *   • See his top-20 High-priority New leads with names + phone numbers
 *   • Trigger a manual FMCSA import from anywhere on the local network
 *
 * No new npm dependencies — uses Node's built-in `http` module.
 * Uses the same DB connection and FMCSA logic as the rest of the app.
 */

import * as http from 'http'
import type Database from 'better-sqlite3'
import { importFmcsaLeads, writeImportMeta } from './fmcsaImport'

const PORT = 3001

// ── Types ─────────────────────────────────────────────────────────────────

interface HotLead {
  name:           string
  phone:          string | null
  mc_number:      string | null
  state:          string | null
  fleet_size:     number | null
  authority_date: string | null
}

// ── DB helpers ────────────────────────────────────────────────────────────

function getTopLeads(db: Database.Database, limit = 20): HotLead[] {
  return db.prepare(`
    SELECT name, phone, mc_number, state, fleet_size, authority_date
    FROM   leads
    WHERE  status = 'New' AND priority = 'High'
    ORDER  BY authority_date DESC
    LIMIT  ?
  `).all(limit) as HotLead[]
}

function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? null
}

// ── HTML (mobile-friendly, self-contained) ────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>OnTrack Hot Leads</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#141416;color:#e5e7eb;min-height:100vh;padding:16px 14px 32px}
    h1{font-size:1.3rem;font-weight:700;color:#f97316;margin-bottom:2px}
    .sub{font-size:.75rem;color:#6b7280;margin-bottom:18px}
    .import-btn{width:100%;padding:15px;background:#ea580c;color:#fff;border:none;
                border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;
                margin-bottom:12px;letter-spacing:.01em;-webkit-tap-highlight-color:transparent}
    .import-btn:active{background:#c2410c}
    .import-btn:disabled{opacity:.45;cursor:not-allowed}
    .status{font-size:.8rem;color:#9ca3af;margin-bottom:16px;min-height:20px;line-height:1.4}
    .last-run{font-size:.72rem;color:#4b5563;margin-bottom:14px}
    .lead{background:#1e2024;border:1px solid #2d3035;border-radius:12px;
          padding:14px 14px 12px;margin-bottom:10px}
    .num{display:inline-block;width:22px;color:#4b5563;font-size:.8rem;font-weight:700;flex-shrink:0}
    .lead-name{font-size:.95rem;font-weight:600;color:#f3f4f6;margin-bottom:3px}
    .lead-phone a{font-size:1rem;color:#f97316;text-decoration:none;font-weight:600}
    .lead-phone .no-phone{font-size:.82rem;color:#4b5563}
    .lead-meta{font-size:.72rem;color:#6b7280;margin-top:5px}
    .badge{display:inline-block;background:#1e1b4b;color:#a5b4fc;border:1px solid #3730a3;
           border-radius:4px;font-size:.65rem;padding:1px 5px;margin-left:5px;vertical-align:middle}
    .empty{text-align:center;color:#4b5563;padding:48px 0;font-size:.9rem;line-height:1.8}
    .divider{height:1px;background:#1f2228;margin:14px 0}
    .refresh{float:right;font-size:.72rem;color:#374151;cursor:pointer;text-decoration:underline;
             margin-top:2px}
  </style>
</head>
<body>
  <h1>&#x1F525; OnTrack Hot Leads</h1>
  <p class="sub">Top 20 &middot; High Priority &middot; Status: New</p>

  <button class="import-btn" id="importBtn" onclick="runImport()">
    Import FMCSA Leads Now
  </button>

  <div class="status" id="status"></div>
  <div class="last-run" id="lastRun"></div>
  <div class="divider"></div>

  <div id="leads"></div>

  <script>
    async function loadLeads() {
      try {
        const res  = await fetch('/api/leads/hot')
        const data = await res.json()
        const el   = document.getElementById('leads')
        if (!Array.isArray(data) || !data.length) {
          el.innerHTML = '<div class="empty">No high-priority new leads yet.<br>Tap <b>Import FMCSA Leads Now</b> to pull today\\'s carriers.</div>'
          return
        }
        el.innerHTML = data.map((l, i) => {
          const mc   = l.mc_number ? '<span class="badge">'+l.mc_number+'</span>' : ''
          const ph   = l.phone
            ? '<div class="lead-phone"><a href="tel:'+l.phone+'">'+l.phone+'</a></div>'
            : '<div class="lead-phone"><span class="no-phone">No phone on file</span></div>'
          const meta = [
            l.state,
            l.fleet_size != null ? l.fleet_size+(l.fleet_size===1?' truck':' trucks') : null,
            l.authority_date ? 'Auth: '+l.authority_date : null,
          ].filter(Boolean).join(' &middot; ')
          return '<div class="lead">'
            + '<div class="lead-name"><span class="num">'+(i+1)+'.</span> '+escHtml(l.name||'—')+mc+'</div>'
            + ph
            + (meta ? '<div class="lead-meta">'+meta+'</div>' : '')
            + '</div>'
        }).join('')
      } catch(e) {
        document.getElementById('leads').innerHTML =
          '<div class="empty">Could not load leads: '+escHtml(String(e))+'</div>'
      }
    }

    async function runImport() {
      const btn    = document.getElementById('importBtn')
      const status = document.getElementById('status')
      btn.disabled = true
      btn.textContent = 'Importing\u2026'
      status.textContent = 'Connecting to FMCSA\u2014this can take 1\u20132 minutes\u2026'
      try {
        const res  = await fetch('/api/leads/fmcsa-import', { method: 'POST' })
        const data = await res.json()
        if (data.error) {
          status.textContent = '\u26A0\uFE0F ' + data.error
          return
        }
        status.textContent =
          '\u2705 Found: '+data.leadsFound+' \u00B7 Added: '+data.leadsAdded+' \u00B7 Skipped: '+data.duplicatesSkipped
        await loadLeads()
      } catch(e) {
        status.textContent = '\u26A0\uFE0F Import failed: '+String(e)
      } finally {
        btn.disabled    = false
        btn.textContent = 'Import FMCSA Leads Now'
      }
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    }

    // Load leads on page open
    loadLeads()
  </script>
</body>
</html>`

// ── Request handler ───────────────────────────────────────────────────────

async function handleRequest(
  req:    http.IncomingMessage,
  res:    http.ServerResponse,
  getDb:  () => Database.Database,
  getKey: (key: string) => unknown,
): Promise<void> {
  const url    = req.url ?? '/'
  const method = req.method ?? 'GET'

  // CORS — allow phone on local network
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // GET /api/leads/hot — return top-20 High+New leads
  if (url === '/api/leads/hot' && method === 'GET') {
    try {
      const leads = getTopLeads(getDb())
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(leads))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  // POST /api/leads/add — add a single lead (e.g. from Facebook scouting)
  if (url === '/api/leads/add' && method === 'POST') {
    try {
      const chunks: Buffer[] = []
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', resolve)
        req.on('error', reject)
      })
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
        name:           string
        phone?:         string | null
        company?:       string | null
        source?:        string
        notes?:         string
        priority?:      string
        follow_up_date?: string | null
      }
      if (!body.name) throw new Error('name is required')
      const db  = getDb()
      const now = new Date().toISOString()
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
      const result = db.prepare(
        'INSERT INTO leads (name, company, phone, source, status, priority, notes, follow_up_date, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        body.name,
        body.company   ?? null,
        body.phone     ?? null,
        body.source    ?? 'Facebook',
        'New',
        body.priority  ?? 'High',
        body.notes     ?? null,
        body.follow_up_date ?? tomorrow,
        now,
      )
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, id: result.lastInsertRowid }))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  // POST /api/leads/fmcsa-import — trigger manual FMCSA import
  if (url === '/api/leads/fmcsa-import' && method === 'POST') {
    try {
      const db         = getDb()
      const webKey     = getKey('fmcsa_web_key') as string | undefined
      const termsRaw   = getSetting(db, 'fmcsa_search_terms')
      const searchTerms: string[] | undefined = termsRaw
        ? termsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        : undefined
      const result = await importFmcsaLeads(db, webKey, searchTerms)
      writeImportMeta(db, result, 'manual')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  // Serve the HTML UI for all other routes (including '/')
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(HTML)
}

// ── Public API ────────────────────────────────────────────────────────────

let _server: http.Server | null = null

export function startWebServer(
  getDb:  () => Database.Database,
  getKey: (key: string) => unknown,
): void {
  if (_server) return   // already running

  _server = http.createServer((req, res) => {
    handleRequest(req, res, getDb, getKey).catch(err => {
      console.error('[WebServer] Unhandled error:', err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    })
  })

  _server.listen(PORT, '0.0.0.0', () => {
    console.log('[WebServer] Hot leads dashboard running → http://0.0.0.0:' + PORT)
    console.log('[WebServer] Access from phone: http://<YOUR-PC-IP>:' + PORT)
  })

  _server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn('[WebServer] Port ' + PORT + ' already in use — web server not started.')
    } else {
      console.error('[WebServer] Server error:', err)
    }
  })
}

export function stopWebServer(): void {
  if (_server) {
    _server.close()
    _server = null
    console.log('[WebServer] Stopped')
  }
}
