import { useState } from 'react'
import { ArrowUpRight, ArrowRight, ArrowLeft, MapPin, BedDouble, Search, Check, ShieldCheck } from 'lucide-react'
import { categories } from './data'
import { Link, ButtonLink, Period, SectionTitle, Card, Steps, CTA } from './shared'

const slides = [
  { image: '/assets/hero-apartment.webp', title: 'A fresh perspective on home.', caption: 'Thoughtful spaces. Everyday comfort.' },
  { image: '/assets/two-bhk.webp', title: 'A little more room for life.', caption: 'Space to settle in. Room to grow.' },
  { image: '/assets/one-bhk.webp', title: 'Your next chapter starts here.', caption: 'Make yourself at home in the UAE.' },
]

function HomeSearch({ go, properties, areas }) {
  const [area, setArea] = useState(''), [type, setType] = useState(''), [period, setPeriod] = useState('monthly')
  const availableAreas = [...new Set([...areas.map(a => a.name), ...properties.map(p => p.area)])]
  return <section className="destination-search" aria-label="Find a rental home">
    <div className="destination-search-top"><span>Find a home that fits your life</span><Period value={period} onChange={setPeriod} /></div>
    <form onSubmit={e => { e.preventDefault(); go(`/properties?area=${encodeURIComponent(area)}&type=${type}&period=${period}`) }}>
      <label><MapPin size={21} /><span><small>WHERE WOULD YOU LIKE TO LIVE?</small><select aria-label="Choose area" value={area} onChange={e => setArea(e.target.value)}><option value="">Explore all UAE areas</option>{availableAreas.map(a => <option key={a}>{a}</option>)}</select></span></label>
      <label><BedDouble size={21} /><span><small>YOUR KIND OF SPACE</small><select aria-label="Choose property type" value={type} onChange={e => setType(e.target.value)}><option value="">All property types</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></span></label>
      <button className="btn" type="submit"><Search size={18} /> Find my home <ArrowUpRight size={18} /></button>
    </form>
  </section>
}

export default function Landing({ go, properties, areas, saved, toggleSave }) {
  const [slide, setSlide] = useState(0)
  return <main className="landing-page">
    <section className="destination-hero" aria-label="Welcome to Bayt and Brick">
      <div className="destination-images">{slides.map((s, i) => <img key={s.image} className={i === slide ? 'visible' : ''} src={s.image} alt={i === slide ? s.caption : ''} aria-hidden={i !== slide} fetchPriority={i === 0 ? 'high' : 'auto'} />)}</div>
      <div className="destination-overlay" />
      <div className="destination-copy"><span className="eyebrow">UAE HOMES. EXCEPTIONAL EVERYDAY LIVING.</span><h1>Find your place.<br />Live your way.</h1><p>From a first studio to a family apartment. Discover a home you love, in a neighbourhood that feels like you.</p><div className="destination-actions"><ButtonLink to="/properties" go={go}>Explore our properties</ButtonLink><Link to="/about" go={go} className="hero-story-link">Get to know us <ArrowUpRight size={18} /></Link></div></div>
      <div className="destination-bottom"><span className="slide-caption" aria-live="polite"><i />{slides[slide].title}</span><div className="slider-controls"><span>{String(slide + 1).padStart(2, '0')} <small>/ 03</small></span><button aria-label="Previous featured image" onClick={() => setSlide((slide + 2) % 3)}><ArrowLeft size={19} /></button><button aria-label="Next featured image" onClick={() => setSlide((slide + 1) % 3)}><ArrowRight size={19} /></button></div></div>
    </section>
    <HomeSearch go={go} properties={properties} areas={areas} />
    <section className="welcome-section"><span className="eyebrow">WELCOME TO BAYT & BRICK</span><h2>Great homes.<br className="mobile-break" /> Even better beginnings.</h2><p>A home is more than an address. It's where your everyday life happens. We bring together studios, one-bedroom and two-bedroom apartments across the UAE, with <strong>monthly and yearly rental options</strong> to suit your next chapter.</p><div className="welcome-promises"><span><Check /> Flexible rental periods</span><span><Check /> Clear property details</span><span><Check /> Personal viewing support</span></div><Link className="text-link" to="/about" go={go}>Discover our story <ArrowUpRight size={17} /></Link></section>
    <section className="section featured-section"><SectionTitle eyebrow="FIND SOMEWHERE TO CALL YOUR OWN" title="Browse our properties" copy="A selection of spaces to help you picture your next move." to="/properties" go={go} link="View all properties" /><div className="property-grid">{properties.slice(0, 6).map(p => <Card key={p.id} p={p} go={go} saved={saved.includes(p.id)} toggleSave={toggleSave} />)}</div>{!properties.length && <div className="empty"><h3>New homes are on their way.</h3><p>Speak to our team about your preferred area and budget.</p><ButtonLink to="/contact" go={go}>Get in touch</ButtonLink></div>}</section>
    <section className="section category-section"><SectionTitle eyebrow="YOUR SPACE. YOUR LIFESTYLE." title="Make room for what matters." copy="Just enough space, a little more privacy, or room for everyone." /><div className="category-grid">{categories.map((c, i) => <Link key={c.slug} to={'/properties/' + c.slug} go={go} className="category-card"><img src={c.image} alt={c.label + ' apartment interior'} loading="lazy" /><div className="category-shade" /><span className="category-number">0{i + 1}</span><div className="category-copy"><div><span>{['A SPACE OF YOUR OWN', 'MORE ROOM TO UNWIND', 'BRING EVERYONE HOME'][i]}</span><h3>{c.label === 'Studio' ? 'Studio apartments' : c.label + ' apartments'}</h3></div><span className="category-arrow"><ArrowUpRight /></span></div></Link>)}</div></section>
    <section className="section destination-areas"><SectionTitle eyebrow="DISCOVER YOUR NEIGHBOURHOOD" title="Where will life take you?" copy="From connected city communities to quieter residential corners. Find your fit." to="/areas" go={go} link="Explore all areas" /><div className="destination-area-grid">{areas.slice(0, 4).map((a, i) => <Link key={a.name} to={'/properties?area=' + encodeURIComponent(a.name)} go={go} className="destination-area-card"><div><img src={a.image} alt={'Residential living inspiration for ' + a.name} loading="lazy" /><span>{a.emirate}</span></div><small>0{i + 1} / EXPLORE THE AREA</small><h3>{a.name}<ArrowUpRight size={23} /></h3><p>{a.note}</p><span className="text-link">Discover homes <ArrowRight size={15} /></span></Link>)}</div><p className="sample-note">Neighbourhood images are lifestyle inspiration and may not show the named location.</p></section>
    <section className="destination-story"><div><img src="/assets/muwaileh-neighbourhood.webp" alt="A residential neighbourhood in Sharjah" loading="lazy" /></div><div className="destination-story-copy"><span className="eyebrow">A MORE PERSONAL WAY TO RENT</span><h2>Local places.<br />A human connection.</h2><p>Finding your next home should feel exciting. Explore at your own pace, save your favourites and let us know when you're ready to look around.</p><p>Our team can help you take the next step, from your first question to arranging a viewing.</p><ButtonLink to="/contact" go={go}>Let's find your home</ButtonLink></div></section>
    <Steps />
    <section className="section rental-faq"><SectionTitle eyebrow="A FEW THINGS YOU MIGHT BE WONDERING" title="Before you make your move." /><div>{[['Can I rent monthly or yearly?', 'Yes. Use the monthly and yearly switch to browse prices for each rental period. Confirm the exact payment schedule and lease conditions with the team before booking.'], ['How do I arrange a viewing?', 'Open a property and complete the viewing request form, or visit Contact. Your request is saved for our team, who can follow up using the contact details you provide.'], ['Are the homes furnished?', 'You can browse both furnished and unfurnished homes. Each listing shows its furnishing status, and you can filter the results to match your preference.'], ['What should I confirm before moving in?', 'Ask the team about availability, the deposit, utilities, fees and the rental agreement. Sample listings are design previews and should be replaced with confirmed inventory before launch.']].map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    <CTA go={go} />
  </main>
}
