import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, LockKeyhole } from 'lucide-react'
import { api } from './shared'

export default function Inquiry({ property = '', propertyName = '', reference = '' }) {
  const [state, setState] = useState('')
  const [error, setError] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const sending = useRef(false)

  async function submit(event) {
    event.preventDefault()
    if (sending.current) return
    sending.current = true
    setState('sending')
    setError('')
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const message = [
      'Holidayzone viewing enquiry',
      `Name: ${data.name}`,
      `Phone / WhatsApp: ${data.phone}`,
      `Preferred move-in date: ${data.date}`,
      property ? `Property: ${propertyName || property}` : 'Property: General enquiry',
      reference && `Reference: ${reference}`,
      property && `Link: ${location.origin}/property/${encodeURIComponent(property)}`,
      `Message: ${data.message || 'Not provided'}`,
    ].filter(Boolean).join('\n')
    const url = `https://wa.me/971509794499?text=${encodeURIComponent(message)}`

    // Reserve the tab during the click, before the asynchronous save, to avoid popup blocking.
    let tab
    try {
      tab = window.open('about:blank', '_blank')
      if (tab) {
        tab.opener = null
        tab.document.title = 'Preparing your enquiry'
        tab.document.body.textContent = 'Saving your enquiry. WhatsApp will open here shortly.'
      }
    } catch { /* The saved confirmation provides a normal link if popups are blocked. */ }

    try {
      await api('/enquiries', { method: 'POST', body: JSON.stringify({ ...data, property }) })
    } catch (err) {
      if (tab && !tab.closed) tab.close()
      setError(err.message)
      setState('')
      sending.current = false
      return
    }
    setWhatsappUrl(url)
    setState('sent')
    sending.current = false
    try { if (tab && !tab.closed) tab.location.replace(url) } catch { /* Keep the fallback link available. */ }
  }

  if (state === 'sent') return <div className="success" role="status">
    <span><Check /></span><h3>Your enquiry is saved.</h3>
    <p>Tap Send in WhatsApp to share your enquiry with 050 979 4499. If WhatsApp did not open, use the button below.</p>
    <a className="btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Open WhatsApp <ArrowUpRight size={17} /></a>
    <button className="text-link" onClick={() => { setState(''); setWhatsappUrl('') }}>Send another enquiry <ArrowRight size={16} /></button>
  </div>

  return <form className="inquiry-form" onSubmit={submit}>
    <label>Your name<input name="name" autoComplete="name" placeholder="Full name" required maxLength={100} /></label>
    <label>Phone / WhatsApp<input name="phone" autoComplete="tel" type="tel" placeholder="+971 50 123 4567" required minLength={7} maxLength={25} /></label>
    <label>Preferred move-in date<input name="date" type="date" min={new Date().toLocaleDateString('en-CA')} required /></label>
    <label>A little about your ideal home<textarea name="message" placeholder="Your preferred area, budget, or anything we should know" rows={3} maxLength={2000} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Saving enquiry...' : 'Submit & open WhatsApp'}<ArrowUpRight size={17} /></button>
    <small><LockKeyhole size={12} /> Your enquiry is saved with our rental team. WhatsApp opens next; tap Send to share it.</small>
  </form>
}
