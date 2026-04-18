import nodemailer from 'nodemailer'

export interface SmtpConfig {
  host:   string
  port:   number
  secure: boolean  // true = SSL/TLS on port 465; false = STARTTLS on 587
  user:   string
  pass:   string
}

export interface SendEmailOptions {
  from:      string       // authenticated SMTP user address
  fromName:  string       // display name, e.g. "OnTrack Hauling Solutions"
  to:        string
  replyTo?:  string
  subject:   string
  text:      string
}

export interface SendResult {
  ok:      boolean
  message: string
}

export async function sendEmail(smtp: SmtpConfig, opts: SendEmailOptions): Promise<SendResult> {
  const missing: string[] = []
  if (!smtp.host) missing.push('smtp_host')
  if (!smtp.user) missing.push('smtp_user')
  if (!smtp.pass) missing.push('smtp_pass')
  if (missing.length > 0) {
    return {
      ok:      false,
      message: `SMTP not configured — missing: ${missing.join(', ')}. Go to Settings > Email Configuration and click Save.`,
    }
  }

  const transporter = nodemailer.createTransport({
    host:   smtp.host,
    port:   smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    // Reject self-signed certs — can be relaxed later if needed
    tls: { rejectUnauthorized: true },
  })

  await transporter.sendMail({
    from:    `"${opts.fromName}" <${opts.from}>`,
    to:      opts.to,
    replyTo: opts.replyTo ?? opts.from,
    subject: opts.subject,
    text:    opts.text,
  })

  return { ok: true, message: `Email sent to ${opts.to}` }
}
