import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Phone, X, Send, ArrowUpRight } from 'lucide-react'
import { answerQuestion } from './assistantLogic'
import { money } from './shared'
import './assistant.css'

export default function Assistant({ properties, areas, go }) {
  const [open, setOpen] = useState(false), [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ text: 'Hello! Tell me your preferred area, home type and budget. I can help you explore our listings or request a viewing.', role: 'assistant' }])
  const field = useRef(null), log = useRef(null), trigger = useRef(null)
  useEffect(() => { if (open) field.current?.focus() }, [open])
  useEffect(() => { if (open && log.current) log.current.scrollTop = log.current.scrollHeight }, [messages, open])
  function close() { setOpen(false); trigger.current?.focus() }
  function send(value) { const text = value.trim(); if (!text) return; setMessages(m => [...m, { role: 'user', text }, { role: 'assistant', ...answerQuestion(text, properties, areas) }]); setInput(''); field.current?.focus() }
  function navigate(url) { close(); go(url) }
  return <div className="rental-assistant">
    {open && <section className="rental-assistant-panel" role="dialog" aria-label="Property assistant" onKeyDown={e => { if (e.key === 'Escape') close() }}>
      <div className="rental-assistant-heading"><MessageCircle size={22}/><div><strong>Your property assistant</strong><small>Instant listing guidance</small></div><button onClick={close} aria-label="Close assistant"><X size={20}/></button></div>
      <div className="rental-assistant-log" ref={log} role="log" aria-live="polite">{messages.map((m,i) => <div key={i} className={'assistant-message ' + m.role}><p>{m.text}</p>{m.matches?.map(p => <button className="assistant-home" key={p.id} onClick={() => navigate('/property/'+p.id+'?period='+m.period)}><img src={p.image} alt=""/><span><strong>{p.name}</strong><small>AED {money(m.period === 'yearly' ? p.yearlyPrice : p.price)} / {m.period === 'yearly' ? 'year' : 'month'}{p.demo ? ' ? Sample' : ''}</small></span><ArrowUpRight size={16}/></button>)}{m.url && <button className="assistant-link" onClick={() => navigate(m.url)}>Explore these filters <ArrowUpRight size={14}/></button>}{m.contact && <button className="assistant-link" onClick={() => navigate('/contact')}>Contact the rental team <ArrowUpRight size={14}/></button>}</div>)}</div>
      <div className="assistant-suggestions">{['Studio under AED 2,000', 'Unfurnished 1 BHK', 'Book a viewing'].map(text => <button key={text} onClick={() => send(text)}>{text}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); send(input) }}><input ref={field} aria-label="Message property assistant" placeholder="Area, budget or a question?" value={input} maxLength={500} onChange={e => setInput(e.target.value)}/><button type="submit" disabled={!input.trim()} aria-label="Send message"><Send size={19}/></button></form>
      <p className="assistant-disclosure">Automated search help ? English & simple Roman Urdu</p>
    </section>}
    <div className="contact-action-dock" role="group" aria-label="Contact Holidayzone">
      <a className="quick-contact quick-contact-call" href="tel:+971543592223" aria-label="Call 0543592223" title="Call 0543592223"><Phone size={19}/><span>Call</span></a>
      <a className="quick-contact quick-contact-whatsapp" href="https://wa.me/971509794499" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp 0509794499 (opens in a new tab)" title="WhatsApp 0509794499"><MessageCircle size={19}/><span>WhatsApp</span></a>
    </div>
    <button ref={trigger} className="assistant-launcher" aria-label="Ask assistant" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}><MessageCircle size={21}/><span>Ask assistant</span></button>
  </div>
}
