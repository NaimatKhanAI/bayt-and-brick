import { useState } from 'react'
import { ArrowUpRight, ArrowRight, ArrowLeft } from 'lucide-react'
import { categories } from './data'
import { Link, Card } from './shared'

const slides = [
  { image: '/assets/hero-apartment.webp', caption: 'Living and dining space' },
  { image: '/assets/two-bhk.webp', caption: 'Apartment interior' },
  { image: '/assets/one-bhk.webp', caption: 'Separate living room' },
]

export default function Landing({ go, properties, areas, saved, toggleSave }) {
  const [slide, setSlide] = useState(0)
  return <main className="rental-home">
    <section className="home-lead home-lead-simple">
      <div className="home-lead-copy">
        <span className="home-kicker">HOLIDAYZONE / RESIDENTIAL RENTALS</span>
        <h1>Find a place to call home.</h1>
        <p>Search studios and apartments across the UAE. Your area, your budget, your next home.</p>

      </div>
      <figure className="home-lead-media">
        <div className="home-lead-images">{slides.map((s,i)=><img key={s.image} src={s.image} alt={i===slide?s.caption:''} aria-hidden={i!==slide} className={i===slide?'visible':''} fetchPriority={i===0?'high':'auto'}/>)}</div>
        <figcaption><span aria-live="polite">{slides[slide].caption}</span><div><span>{slide+1} / {slides.length}</span><button aria-label="Previous featured image" onClick={()=>setSlide((slide+2)%3)}><ArrowLeft size={18}/></button><button aria-label="Next featured image" onClick={()=>setSlide((slide+1)%3)}><ArrowRight size={18}/></button></div></figcaption>
      </figure>
    </section>

    <section className="home-inventory home-section">
      <div className="home-section-heading"><div><span className="home-kicker">PROPERTY CATALOGUE</span><h2>Explore rentals in the UAE</h2><p>Monthly and yearly rental options. Confirm availability with the team.</p></div><Link className="home-text-link" to="/properties" go={go}>All properties <ArrowUpRight size={18}/></Link></div>
      <nav className="home-types" aria-label="Browse by property type">{categories.map(c=><Link key={c.slug} to={'/properties/'+c.slug} go={go}>{c.label}</Link>)}</nav>
      {properties.length ? <div className="property-grid">{properties.slice(0,6).map(p=><Card key={p.id} p={p} go={go} saved={saved.includes(p.id)} toggleSave={toggleSave}/>)}</div> : <div className="home-empty"><h3>No homes listed at the moment.</h3><p>Contact us with your preferred neighbourhood and budget.</p><Link className="home-text-link" to="/contact" go={go}>Speak to our team <ArrowUpRight size={17}/></Link></div>}
    </section>

    <section className="home-viewing-guide home-section"><img src="/assets/one-bhk.webp" alt="Living room with space to relax" loading="lazy"/><div><span className="home-kicker">FROM SEARCH TO VIEWING</span><h2>See the details.<br/>Then see it in person.</h2><p>Compare rental prices, apartment sizes and furnishing before you visit. Save the homes that suit you and send the team your preferred viewing date.</p><ol><li>Choose an area and set your budget.</li><li>Review photos, prices and availability.</li><li>Request a viewing with the rental team.</li></ol><Link className="home-primary" to="/properties" go={go}>Browse apartments <ArrowUpRight size={18}/></Link></div></section><section className="renter-tools home-section" aria-label="Rental tools"><div><h2>Your rental search, all in one place.</h2><p>Keep a shortlist, compare the details and contact the team when you are ready.</p></div><div className="renter-tool-links"><Link to="/properties?saved=true" go={go}><span>Saved homes</span><p>Return to the properties you have saved.</p><ArrowUpRight size={22}/></Link><Link to="/properties" go={go}><span>Find your rental</span><p>Filter by price, furnishing and move-in date.</p><ArrowUpRight size={22}/></Link><Link to="/contact" go={go}><span>Arrange a viewing</span><p>Share a reference and speak to our team.</p><ArrowUpRight size={22}/></Link></div></section>

    <section className="home-communities home-section">
      <div className="home-community-intro"><span className="home-kicker">NEIGHBOURHOODS</span><h2>Start with<br/>the location.</h2><p>See where properties are listed, then narrow your search to the area that suits you.</p><Link className="home-text-link" to="/areas" go={go}>Explore all areas <ArrowUpRight size={18}/></Link><figure><img src="/assets/muwaileh-neighbourhood.webp" alt="Residential buildings and a neighbourhood street" loading="lazy"/><figcaption>Residential setting. Individual listing locations vary.</figcaption></figure></div>
      <div className="home-community-list">{areas.map(a=>{const count=properties.filter(p=>p.area===a.name).length;return <Link key={a.id||a.name} to={'/properties?area='+encodeURIComponent(a.name)} go={go}><span><small>{a.emirate}</small><h3>{a.name}</h3></span><span>{count?`${count} ${count===1?'listing':'listings'}`:'No current listings'}<ArrowUpRight size={19}/></span></Link>})}{!areas.length&&<p>Contact us about your preferred area.</p>}</div>
    </section>

    <section className="home-help home-section"><div><span className="home-kicker">RENTAL QUESTIONS</span><h2>Before you book<br/>a viewing.</h2><p>A few details to help you plan your search.</p></div><div>{[
      ['How do I arrange a viewing?', 'Open the property and send a viewing request, or contact us with its reference number. The team will confirm the arrangements.'],
      ['Can I compare monthly and yearly prices?', 'Yes. Use the rental period selector to see the listed price for each period. Confirm the payment schedule and agreement for the home you choose.'],
      ['Are utilities and deposits included?', 'These depend on the property. Ask the team to confirm the deposit, utilities and any additional fees before committing.'],
      ['How does the move-in date filter work?', 'It shows homes with a listed availability date on or before your chosen date. Homes without a confirmed date are excluded from date-filtered results.'],
    ].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

    <section className="home-enquiry"><div><span className="home-kicker">SPEAK TO HOLIDAYZONE</span><h2>Have a home in mind?</h2><p>Send us the reference, your budget and your planned move-in date.</p></div><Link className="home-primary" to="/contact" go={go}>Arrange a viewing <ArrowUpRight size={19}/></Link></section>
  </main>
}
