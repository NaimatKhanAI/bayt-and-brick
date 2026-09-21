import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Bath, BedDouble, Bot, Building2, CalendarDays, Camera,
  Check, ChevronDown, ChevronLeft, Expand, Heart, Home, KeyRound, MapPin,
  Menu, MessageCircle, Play, Ruler, Search, Send, ShieldCheck, Sparkles,
  Users, Wifi, X,
} from 'lucide-react'
import { allListings, categories, getCategory, getListing, listingsFor } from './data'

const assistantPrompts = ['Studio under AED 2,000', 'Show me a 1 BHK', 'Book a viewing']
const amenityItems = [
  [Wifi, 'High-speed internet'],
  [ShieldCheck, '24/7 security'],
  [Building2, 'Lift access'],
  [Home, 'Covered parking'],
  [Users, 'Family-friendly'],
]

function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const go = (next) => {
    window.history.pushState({}, '', next)
    setPath(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return [path, go]
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={() => onClick('/')} aria-label="Holidayzone home">
      <span className="brand-name">Holidayzone</span>
      <span className="brand-subtitle">Residential Rentals</span>
    </button>
  )
}

function Header({ go, path, onOpenAssistant }) {
  const [open, setOpen] = useState(false)
  const navigate = (to) => { setOpen(false); go(to) }
  const goToSection = (id) => {
    navigate('/')
    setTimeout(() => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' }), 80)
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={navigate} />
        <button className="menu-button" onClick={() => setOpen(current => !current)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        <nav className={`nav ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
          <button className={path === '/' ? 'is-active' : ''} onClick={() => goToSection('#homes')}>Homes</button>
          <button onClick={() => goToSection('#locations')}>Locations</button>
          <button onClick={() => goToSection('#process')}>How it works</button>
          <button className="nav-assistant" onClick={() => { setOpen(false); onOpenAssistant() }}>Ask our assistant</button>
          <button className="button button--accent header-cta" onClick={() => goToSection('#inquiry')}>Book a viewing <ArrowRight /></button>
        </nav>
      </div>
    </header>
  )
}

function ArchLines({ className = '' }) {
  return <span className={`arch-lines ${className}`} aria-hidden="true"><i /><i /><i /><i /></span>
}

function SearchDock({ go }) {
  const [homeType, setHomeType] = useState('')
  const searchHomes = () => homeType ? go(`/${homeType}`) : document.querySelector('#homes')?.scrollIntoView({ behavior: 'smooth' })
  return (
    <div className="search-dock" aria-label="Search homes">
      <label><MapPin /><span><small>Location</small><strong>Muwaileh, Sharjah</strong></span><ChevronDown /></label>
      <label><Home /><span><small>Home type</small><select value={homeType} onChange={event => setHomeType(event.target.value)} aria-label="Home type"><option value="">Any</option>{categories.map(category => <option value={category.slug} key={category.slug}>{category.label}</option>)}</select></span><ChevronDown /></label>
      <label><span className="wallet-icon">AED</span><span><small>Monthly budget</small><select aria-label="Monthly budget"><option>Any</option><option>Up to AED 2,000</option><option>AED 2,000–3,000</option><option>AED 3,000+</option></select></span><ChevronDown /></label>
      <button className="button button--accent search-button" onClick={searchHomes}>Search homes <Search /></button>
    </div>
  )
}

function HomePage({ go, onOpenAssistant }) {
  const featured = categories.map(category => ({ ...listingsFor(category)[0], description: category.description }))
  return (
    <main>
      <section className="home-hero">
        <ArchLines className="home-hero__arch" />
        <div className="home-hero__layout">
          <div className="home-hero__copy reveal"><h1>Find a home<br />that feels right.</h1><p>Verified long-term studios and apartments in Muwaileh, Sharjah. Clear details, fair terms and guided viewings.</p><div className="hero-actions"><button className="button button--accent" onClick={() => document.querySelector('#homes')?.scrollIntoView({ behavior: 'smooth' })}>Explore homes <ArrowRight /></button><button className="button button--ghost" onClick={onOpenAssistant}><MessageCircle /> Ask the property assistant</button></div></div>
          <div className="home-hero__media reveal reveal--delay"><img src="/assets/hero-apartment.webp" alt="Sunlit apartment available in Muwaileh" fetchPriority="high" /></div>
        </div>
        <SearchDock go={go} />
      </section>

      <section className="homes-showcase" id="homes">
        <div className="section-heading section-heading--side"><div><h2>Homes worth<br />coming back to.</h2><span className="accent-rule" /></div><p>Verified spaces with honest details and straightforward monthly pricing.</p></div>
        <div className="home-preview-grid">{featured.map(listing => <article className="home-preview" key={listing.id}><button className="home-preview__image" onClick={() => go(`/${listing.slug}`)} aria-label={`View ${listing.category} homes`}><img src={listing.image} alt={`${listing.category} rental home`} loading="lazy" /></button><div className="home-preview__body"><span className="home-preview__icon"><BedDouble /></span><div><h3>{listing.category}</h3><p>Muwaileh, Sharjah</p></div><strong>AED {listing.price.toLocaleString()}<small>/mo</small></strong></div></article>)}</div>
      </section>

      <section className="location-story" id="locations"><div className="location-story__copy"><span className="location-label"><MapPin /> Muwaileh, Sharjah</span><h2>Everything you need,<br />close to home.</h2><p>Muwaileh blends comfort and convenience, with schools, retail, parks and daily essentials all just minutes away.</p><button className="button button--accent" onClick={() => go('/studio')}>Explore the neighbourhood <ArrowRight /></button></div><div className="location-story__media"><img src="/assets/muwaileh-neighbourhood.webp" alt="Muwaileh neighbourhood in Sharjah" loading="lazy" /></div></section>

      <section className="process-section" id="process"><ArchLines className="process-arch process-arch--left" /><ArchLines className="process-arch process-arch--right" /><h2>Renting, made<br />refreshingly simple.</h2><ol className="process-rail"><li><span>01</span><div><MessageCircle /><h3>Tell us what you need</h3><p>Share your must-haves and we’ll get to work.</p></div></li><li><span>02</span><div><CalendarDays /><h3>Tour your shortlist</h3><p>We’ll arrange viewings that fit your schedule.</p></div></li><li><span>03</span><div><KeyRound /><h3>Sign and settle in</h3><p>Clear terms, simple paperwork and support from day one.</p></div></li></ol></section>

      <section className="inquiry-band" id="inquiry"><ArchLines className="inquiry-arch" /><div className="inquiry-band__copy"><h2>Ready to find<br />your place?</h2><span className="accent-rule" /><p>Share a few details and we’ll help you book a viewing.</p></div><InquiryForm dark horizontal /></section>
    </main>
  )
}

function FilterButton({ active, children, onClick }) {
  return <button className={`filter-button ${active ? 'is-active' : ''}`} onClick={onClick}>{children}</button>
}

function ListingCard({ listing, featured, go }) {
  return (
    <article className={`catalog-card ${featured ? 'catalog-card--featured' : ''}`}>
      <button className="catalog-card__media" onClick={() => go(`/${listing.slug}/${listing.id}`)} aria-label={`Open ${listing.name}`}><img src={listing.image} alt={`${listing.name} interior`} loading="lazy" /><span className="photo-count"><Camera /> {listing.images.length}</span></button>
      <div className="catalog-card__content"><span className="property-reference">Ref: {listing.reference}</span><div className="catalog-card__title"><div><h2>{listing.name}</h2><p><MapPin /> {listing.location}</p></div><div className="catalog-card__price"><strong>AED {listing.price.toLocaleString()}</strong><small>/ month</small><em>{listing.available}</em></div></div><div className="catalog-card__footer"><div className="property-facts"><span><BedDouble /> {listing.category}</span><span><Ruler /> {listing.size}</span><span><Sparkles /> {listing.furnished ? 'Furnished' : 'Unfurnished'}</span></div><div className="catalog-card__actions"><button className="button button--accent" onClick={() => go(`/${listing.slug}/${listing.id}`)}>View home <ArrowRight /></button><button className="save-button" aria-label="Save home"><Heart /></button></div></div></div>
    </article>
  )
}

function CategoryPage({ category, go, onOpenAssistant }) {
  const [furnished, setFurnished] = useState('all')
  const [sort, setSort] = useState('recommended')
  const [budget, setBudget] = useState('all')
  const listings = useMemo(() => {
    const filtered = listingsFor(category).filter(item => (furnished === 'all' || String(item.furnished) === furnished) && (budget === 'all' || item.price <= Number(budget)))
    if (sort === 'low') return filtered.toSorted((a, b) => a.price - b.price)
    if (sort === 'high') return filtered.toSorted((a, b) => b.price - a.price)
    return filtered
  }, [budget, category, furnished, sort])
  return (
    <main className="catalog-page">
      <section className="catalog-intro"><ArchLines className="catalog-arch" /><button className="back-link" onClick={() => go('/')}><ChevronLeft /> Homes</button><h1>{category.label} homes in Muwaileh.</h1><p>{listings.length} verified {listings.length === 1 ? 'home' : 'homes'}, ready to view.</p></section>
      <section className="catalog-results">
        <div className="catalog-filters"><label><MapPin /><span><small>Location</small><strong>Muwaileh, Sharjah</strong></span><ChevronDown /></label><label><span className="wallet-icon">AED</span><span><small>Monthly budget</small><select value={budget} onChange={event => setBudget(event.target.value)} aria-label="Monthly budget"><option value="all">Any</option><option value="2000">Up to 2,000</option><option value="2500">Up to 2,500</option><option value="3000">Up to 3,000</option></select></span><ChevronDown /></label><div className="furnishing-filter"><small>Furnishing</small><div><FilterButton active={furnished === 'all'} onClick={() => setFurnished('all')}>All</FilterButton><FilterButton active={furnished === 'true'} onClick={() => setFurnished('true')}>Furnished</FilterButton><FilterButton active={furnished === 'false'} onClick={() => setFurnished('false')}>Unfurnished</FilterButton></div></div><label><span><small>Sort</small><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort homes"><option value="recommended">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></span><ChevronDown /></label></div>
        {listings.length ? <div className="catalog-grid">{listings.map((listing, index) => <ListingCard listing={listing} featured={index === 0} go={go} key={listing.id} />)}</div> : <div className="empty-results"><h2>No exact matches yet.</h2><p>Try a higher budget or ask our property assistant for the closest option.</p><button className="button button--accent" onClick={onOpenAssistant}>Ask our assistant</button></div>}
        <div className="assistant-cta"><MessageCircle /><div><h2>Not seeing the right fit?</h2><p>Ask our property assistant.</p></div><button className="button button--ghost-light" onClick={onOpenAssistant}>Ask our assistant <ArrowRight /></button><ArchLines /></div>
      </section>
    </main>
  )
}

function MediaGallery({ listing, onRequestVideo }) {
  const [active, setActive] = useState(0)
  const secondary = listing.images.filter((_, index) => index !== active).slice(0, 2)
  return <div className="property-gallery"><div className="property-gallery__main"><img src={listing.images[active]} alt={`${listing.name} main interior`} /><div><button onClick={() => setActive((active + 1) % listing.images.length)}><Expand /> View all photos ({listing.images.length})</button><button onClick={onRequestVideo}><Play /> Request video tour</button></div></div><div className="property-gallery__side">{secondary.map(image => <button key={image} onClick={() => setActive(listing.images.indexOf(image))}><img src={image} alt="Additional property interior" /></button>)}</div></div>
}

function InquiryForm({ dark = false, horizontal = false }) {
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = event => { event.preventDefault(); setSubmitted(true) }
  if (submitted) return <div className={`form-success ${dark ? 'form-success--dark' : ''}`}><span><Check /></span><h3>Request received.</h3><p>Thank you. Our local team will contact you shortly.</p><button onClick={() => setSubmitted(false)}>Send another request</button></div>
  return <form className={`inquiry-form ${dark ? 'inquiry-form--dark' : ''} ${horizontal ? 'inquiry-form--horizontal' : ''}`} onSubmit={handleSubmit}><label>Full name<input name="name" placeholder="Your full name" required /></label><label>Phone / WhatsApp<input name="phone" type="tel" placeholder="05X XXX XXXX" required /></label>{horizontal ? <label>Home type<select name="home_type" defaultValue=""><option value="">Any</option>{categories.map(item => <option key={item.slug}>{item.label}</option>)}</select></label> : null}<label>Move-in date<input name="move_in_date" type="date" required /></label><label className="message-field">Message<textarea name="message" rows={horizontal ? 1 : 3} placeholder="Tell us anything else we should know…" /></label><button className="button button--accent" type="submit">Book a viewing <ArrowRight /></button>{!horizontal ? <small><ShieldCheck /> Your details are secure and only used for this enquiry.</small> : null}</form>
}

function PropertyDetail({ listing, go, onOpenAssistant }) {
  return (
    <main className="detail-page">
      <section className="detail-heading"><ArchLines className="detail-arch" /><button className="back-link" onClick={() => go(`/${listing.slug}`)}><ChevronLeft /> Homes / {listing.category} / {listing.reference}</button><div className="detail-title-row"><div><h1>{listing.name}</h1><p><MapPin /> {listing.location}</p></div><div className="detail-price"><strong>AED {listing.price.toLocaleString()}</strong><span>/ month</span><em>{listing.available}</em><small>Ref: {listing.reference}</small></div><div className="detail-actions"><button className="button button--accent" onClick={() => document.querySelector('#detail-inquiry')?.scrollIntoView({ behavior: 'smooth' })}>Book a viewing <ArrowRight /></button><button className="button button--outline" onClick={onOpenAssistant}><MessageCircle /> Ask assistant</button></div></div></section>
      <section className="detail-layout"><div className="detail-main"><MediaGallery listing={listing} onRequestVideo={() => document.querySelector('#detail-inquiry')?.scrollIntoView({ behavior: 'smooth' })} /><div className="fact-rail"><span><Ruler /><b>{listing.size}</b></span><span><BedDouble /><b>{listing.category}</b></span><span><Bath /><b>{listing.slug === '2-bhk' ? '2 baths' : '1 bath'}</b></span><span><Sparkles /><b>{listing.furnished ? 'Furnished' : 'Unfurnished'}</b></span></div><div className="detail-copy"><div><h2>A calm, practical home.</h2><p>This well-planned home offers bright living spaces, practical storage and a comfortable layout for everyday life. Exact building details, utility inclusions and payment terms are confirmed before your viewing.</p></div><div className="amenities"><h2>Amenities</h2>{amenityItems.map(([Icon, label]) => <span key={label}><Icon /> {label}</span>)}</div></div></div><aside className="detail-enquiry" id="detail-inquiry"><ArchLines /><h2>Enquire about this home</h2><p>We’ll get back to you shortly.</p><InquiryForm dark /></aside></section>
    </main>
  )
}

function buildAssistantReply(rawMessage) {
  const message = rawMessage.trim().toLowerCase()
  const isRomanUrdu = /\b(mujhe|chahiye|dikhao|ghar|kamra|kiraya|budget|karo|karna|hai)\b/.test(message)
  if (/book|viewing|visit|dekhna|appointment/.test(message)) return { text: isRomanUrdu ? 'Bilkul. Main aapko viewing form par le ja sakta hun.' : 'Absolutely. I can take you to the viewing form.', action: true }
  let categorySlug = ''
  if (/\bstudio\b|bachelor|single room/.test(message)) categorySlug = 'studio'
  else if (/\b1\s*(bhk|bed|bedroom)\b|\bone bedroom\b/.test(message)) categorySlug = '1-bhk'
  else if (/\b2\s*(bhk|bed|bedroom)\b|\btwo bedroom\b/.test(message)) categorySlug = '2-bhk'
  const numericMatch = message.match(/(?:under|below|up to|budget(?:\s+is)?|aed)\s*(?:aed\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(k|thousand)?/i)
  let budget = numericMatch ? Number(numericMatch[1].replace(',', '')) : null
  if (budget && numericMatch[2]) budget *= 1000
  const wantsUnfurnished = /unfurnished|without furniture|bina furniture/.test(message)
  const wantsFurnished = /furnished|furniture|saman/.test(message) && !wantsUnfurnished
  const matches = allListings.filter(listing => (!categorySlug || listing.slug === categorySlug) && (!budget || listing.price <= budget) && (!wantsFurnished || listing.furnished) && (!wantsUnfurnished || !listing.furnished)).toSorted((a, b) => a.price - b.price).slice(0, 2)
  if (categorySlug || budget || wantsFurnished || wantsUnfurnished) {
    if (!matches.length) return { text: isRomanUrdu ? 'Exact match nahi mila. Budget flexible ho to main qareebi options dikha sakta hun.' : 'I couldn’t find an exact match. Try a flexible budget or furnishing preference.', action: true }
    return { text: isRomanUrdu ? `Mujhe ${matches.length} current options milay hain.` : `I found ${matches.length} strong current ${matches.length === 1 ? 'match' : 'matches'}.`, listings: matches }
  }
  return { text: isRomanUrdu ? 'Studio, 1 BHK ya 2 BHK aur monthly budget batayein.' : 'Tell me whether you need a studio, 1 BHK or 2 BHK, plus your monthly budget.' }
}

function ChatAssistant({ open, setOpen, go }) {
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState([{ id: 1, from: 'assistant', text: 'Hi! Tell me your home type and monthly budget and I’ll find a match in our current Muwaileh inventory.' }])
  const endRef = useRef(null)
  const timerRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open, typing])
  useEffect(() => () => clearTimeout(timerRef.current), [])
  const sendMessage = value => {
    const next = value.trim()
    if (!next || typing) return
    setMessages(current => [...current, { id: Date.now(), from: 'user', text: next }])
    setInput('')
    setTyping(true)
    timerRef.current = setTimeout(() => { setMessages(current => [...current, { id: Date.now() + 1, from: 'assistant', ...buildAssistantReply(next) }]); setTyping(false) }, 600)
  }
  const openViewing = () => { setOpen(false); go('/'); setTimeout(() => document.querySelector('#inquiry')?.scrollIntoView({ behavior: 'smooth' }), 80) }
  return <div className={`chat-assistant ${open ? 'is-open' : ''}`}>{open ? <section className="chat-panel" role="dialog" aria-label="Holidayzone property assistant"><header><span><Bot /></span><div><strong>Holidayzone Assistant</strong><small><i /> Online · replies instantly</small></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><X /></button></header><div className="chat-messages" aria-live="polite">{messages.map(message => <div className={`chat-message chat-message--${message.from}`} key={message.id}><p>{message.text}</p>{message.listings?.map(listing => <button className="chat-listing" key={listing.id} onClick={() => { setOpen(false); go(`/${listing.slug}/${listing.id}`) }}><img src={listing.image} alt="" /><span><strong>{listing.name}</strong><small>AED {listing.price.toLocaleString()} / month</small></span><ArrowRight /></button>)}{message.action ? <button className="chat-action" onClick={openViewing}>Open viewing form <ArrowRight /></button> : null}</div>)}{typing ? <div className="chat-typing"><i /><i /><i /></div> : null}<div ref={endRef} /></div><div className="chat-prompts">{assistantPrompts.map(prompt => <button key={prompt} onClick={() => sendMessage(prompt)} disabled={typing}>{prompt}</button>)}</div><form className="chat-composer" onSubmit={event => { event.preventDefault(); sendMessage(input) }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about homes or rent…" aria-label="Message the property assistant" /><button aria-label="Send message" disabled={!input.trim() || typing}><Send /></button></form></section> : null}<button className="chat-launcher" onClick={() => setOpen(current => !current)} aria-label={open ? 'Close property assistant' : 'Open property assistant'}>{open ? <X /> : <><MessageCircle /><span>Ask about a home</span></>}</button></div>
}

function Footer({ go }) {
  return <footer className="footer"><div className="footer-grid"><div><Brand onClick={go} /><p>Homes that feel right.</p></div><div><h3>Homes</h3>{categories.map(category => <button onClick={() => go(`/${category.slug}`)} key={category.slug}>{category.label}</button>)}</div><div><h3>Location</h3><p>Muwaileh, Sharjah<br />Muwaileh Commercial</p></div><div><h3>Contact</h3><p>Phone / WhatsApp<br />Viewing requests</p></div></div><div className="footer-bottom"><span>© 2026 Holidayzone Residential Rentals.</span><span>Availability and pricing subject to confirmation.</span></div></footer>
}

export default function App() {
  const [path, go] = usePath()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const parts = path.split('/').filter(Boolean)
  const category = getCategory(parts[0])
  const listing = parts[1] ? getListing(parts[1]) : null
  const openAssistant = () => setAssistantOpen(true)
  let page = <HomePage go={go} onOpenAssistant={openAssistant} />
  if (category && listing) page = <PropertyDetail listing={listing} go={go} onOpenAssistant={openAssistant} />
  else if (category) page = <CategoryPage category={category} go={go} onOpenAssistant={openAssistant} />
  return <><Header go={go} path={path} onOpenAssistant={openAssistant} />{page}<Footer go={go} /><ChatAssistant open={assistantOpen} setOpen={setAssistantOpen} go={go} /></>
}
