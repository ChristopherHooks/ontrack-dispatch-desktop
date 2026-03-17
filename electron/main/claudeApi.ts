/**
 * Lightweight Claude API client — main process only.
 * Uses Node https (no extra npm dependency).
 * Uses claude-haiku-4-5 for fast, low-cost short-form generation.
 *
 * All calls return ClaudeResponse — never throws.
 * Callers should display result.error when result.ok === false.
 */
import * as https from 'https'

const MODEL      = 'claude-haiku-4-5-20251001'
const TIMEOUT_MS = 30_000

export interface ClaudeOk    { ok: true;  content: string }
export interface ClaudeError { ok: false; error: string }
export type ClaudeResponse = ClaudeOk | ClaudeError

export async function claudeComplete(
  apiKey:       string,
  userPrompt:   string,
  systemPrompt: string,
  maxTokens     = 300,
): Promise<ClaudeResponse> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: 'Claude API key not configured. Add it in Settings > AI Integration.' }
  }

  const body = JSON.stringify({
    model:      MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  return new Promise((resolve) => {
    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method:  'POST',
        headers: {
          'x-api-key':         apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
          'content-length':    Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
            if (data.error) {
              const msg = (data.error as Record<string, unknown>).message
              resolve({ ok: false, error: String(msg ?? data.error) })
              return
            }
            const content = (data?.content as Array<{ text?: string }>)?.[0]?.text
            if (typeof content === 'string') {
              resolve({ ok: true, content })
            } else {
              resolve({ ok: false, error: 'Unexpected response shape from Claude API' })
            }
          } catch {
            resolve({ ok: false, error: 'Failed to parse Claude API response' })
          }
        })
      },
    )
    req.on('error', (e: Error) => resolve({ ok: false, error: e.message }))
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy()
      resolve({ ok: false, error: 'Claude API request timed out after ' + TIMEOUT_MS + 'ms' })
    })
    req.write(body)
    req.end()
  })
}
