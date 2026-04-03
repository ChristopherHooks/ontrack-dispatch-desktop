import { useState } from 'react'
import { X, Copy, Save, Check } from 'lucide-react'
import type { Driver } from '../../types/models'
import { useSettingsStore } from '../../store/settingsStore'

interface Props {
  driver: Driver
  onClose: () => void
}

function buildAgreement(
  driver: Driver,
  companyName: string,
  ownerName: string,
  ownerPhone: string,
  ownerEmail: string,
  dispatchPct: number,
): string {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const pct = driver.dispatch_percent ?? dispatchPct
  const carrierName = driver.company || driver.name
  const mc = driver.mc_number ? `MC# ${driver.mc_number}` : 'MC# ___________'
  const dot = driver.dot_number ? `DOT# ${driver.dot_number}` : ''
  const equipment = [driver.truck_type, driver.trailer_type, driver.trailer_length].filter(Boolean).join(', ') || '___________'

  return `DISPATCH SERVICES AGREEMENT

Effective Date: ${today}

PARTIES

Dispatch Company: ${companyName || '___________'}
Contact: ${ownerName || '___________'}
Phone: ${ownerPhone || '___________'}
Email: ${ownerEmail || '___________'}

Carrier: ${carrierName}
${mc}${dot ? '\n' + dot : ''}
Equipment: ${equipment}
Home Base: ${driver.home_base || '___________'}

---

1. SCOPE OF SERVICES

The Dispatch Company agrees to provide the following services to the Carrier:

- Search load boards and the Dispatch Company's broker network for freight matching the Carrier's equipment and preferred lanes
- Contact brokers and negotiate rates on the Carrier's behalf
- Review rate confirmations for accuracy before presenting to the Carrier for approval
- Communicate with shippers and receivers on the Carrier's behalf during active loads
- Pursue detention pay claims when applicable
- Maintain records of completed loads and facilitate invoice documentation

The Dispatch Company is not a freight broker and does not take legal or financial custody of any freight. All services are performed as an independent contractor to the Carrier.

---

2. CARRIER APPROVAL OF LOADS

The Carrier retains full authority over all load acceptance decisions. No load will be booked without the Carrier's explicit approval of the rate confirmation.

The Carrier agrees to review and respond to load offers in a timely manner. The Dispatch Company is not liable for lost freight opportunities resulting from delayed Carrier response.

---

3. DISPATCH FEE

The Carrier agrees to pay the Dispatch Company ${pct}% of the gross load rate (as shown on the rate confirmation) for each successfully completed load.

The dispatch fee is payable to the Dispatch Company within 3 business days of the Carrier receiving payment from the broker or shipper. If the Carrier uses a factoring company, the Carrier is responsible for directing the factoring company to remit the dispatch fee accordingly.

No dispatch fee is owed for loads that are cancelled before the truck is dispatched. If a load is cancelled after dispatch, the parties will negotiate the fee in good faith based on miles driven and time invested.

---

4. CARRIER RESPONSIBILITIES

The Carrier agrees to:

- Maintain active MC authority and all required operating licenses for the duration of this agreement
- Carry the minimum required insurance ($1,000,000 liability, $100,000 cargo) and provide a current Certificate of Insurance upon request
- Communicate promptly regarding load status, delays, and any issues in transit
- Notify the Dispatch Company immediately of any accidents, claims, or compliance issues
- Not engage additional dispatch services for the same equipment without written notice to the Dispatch Company

---

5. DISPATCH COMPANY RESPONSIBILITIES

The Dispatch Company agrees to:

- Search for freight that meets the Carrier's rate floor and lane preferences
- Present all load offers honestly and accurately
- Not book any load without the Carrier's approval
- Check broker payment history and flag brokers with poor payment records before booking
- Handle shipper and broker communication professionally and in the Carrier's best interest

---

6. INDEPENDENT CONTRACTOR RELATIONSHIP

The Carrier is an independent contractor and not an employee or agent of the Dispatch Company. Nothing in this agreement creates a partnership, joint venture, or employer-employee relationship. The Carrier is solely responsible for all operating expenses, taxes, insurance, and compliance obligations related to their trucking operation.

---

7. TERMINATION

Either party may terminate this agreement with 7 days written notice. Termination does not affect the obligation to pay dispatch fees for loads booked prior to the termination date. Notice may be given by email or text message.

---

8. LIMITATION OF LIABILITY

The Dispatch Company is not liable for freight claims, cargo damage, broker non-payment, shipper errors, or any losses arising from the Carrier's operation of their vehicle. The Dispatch Company's total liability under this agreement shall not exceed the dispatch fees paid in the 30 days preceding the claim.

---

9. ENTIRE AGREEMENT

This document constitutes the entire agreement between the parties regarding dispatch services. Any modifications must be agreed to in writing by both parties.

---

SIGNATURES

By signing below, both parties agree to the terms of this Dispatch Services Agreement.

Dispatch Company

Signature: _________________________________
Printed Name: ${ownerName || '___________________________'}
Date: _____________________________________

Carrier

Signature: _________________________________
Printed Name: ${driver.name}
Date: _____________________________________
`
}

export function DispatchAgreementModal({ driver, onClose }: Props) {
  const { companyName, ownerName, ownerPhone, ownerEmail, defaultDispatchPct } = useSettingsStore()
  const [copied, setCopied]  = useState(false)
  const [saved, setSaved]    = useState(false)
  const [saving, setSaving]  = useState(false)

  const text = buildAgreement(driver, companyName, ownerName, ownerPhone, ownerEmail, defaultDispatchPct)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.api.documents.create({
        title:    `Dispatch Agreement — ${driver.company || driver.name}`,
        category: 'Template',
        content:  text,
        tags:     'agreement,dispatch,carrier',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-2xl mx-4 bg-surface-800 border border-surface-400 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]'>

        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-surface-500 shrink-0'>
          <div>
            <h2 className='text-sm font-semibold text-gray-100'>Dispatch Service Agreement</h2>
            <p className='text-xs text-gray-500 mt-0.5'>{driver.company || driver.name} — {driver.dispatch_percent ?? defaultDispatchPct}% fee</p>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-surface-600 text-gray-500 hover:text-gray-300 transition-colors'>
            <X size={16} />
          </button>
        </div>

        {/* Agreement preview */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          <pre className='text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-surface-700 rounded-xl border border-surface-500 p-4'>
            {text}
          </pre>
        </div>

        {/* Actions */}
        <div className='flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-500 shrink-0'>
          <p className='text-2xs text-gray-600 max-w-xs'>
            Review before sending. Fill in any blank fields and adjust terms as needed for your operation.
          </p>
          <div className='flex items-center gap-2 shrink-0'>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-surface-400 bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors disabled:opacity-60'
            >
              {saved ? <Check size={12} className='text-green-400' /> : <Save size={12} />}
              {saved ? 'Saved to Documents' : 'Save to Documents'}
            </button>
            <button
              onClick={handleCopy}
              className='flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors'
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy Agreement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
