import { useLanguage } from './i18n'
import { useState } from 'react'
import { ArrowUpRight, ArrowRight, ArrowLeft } from 'lucide-react'
import { categories } from './data'
import { Link, Card } from './shared'

const slides = [
  { image: '/assets/hero-apartment.webp', caption: 'Living and dining space' },
  { image: '/assets/two-bhk.webp', caption: 'Apartment interior' },
  { image: '/assets/one-bhk.webp', caption: 'Separate living room' },
]

export default function Landing({ go, properties, areas, saved, toggleSave }) {const {t}=useLanguage();
  const [slide, setSlide] = useState(0)
  return <main className="rental-home">
    <section className="home-lead home-lead-simple">
      <div className="home-lead-copy">
        <span className="home-kicker">{t("HOLIDAYZONE / RESIDENTIAL RENTALS")}</span>
        <h1>{t("Find a place to call home.")}</h1>
        <p>{t("Search studios and apartments across the UAE. Your area, your budget, your next home.")}</p>

      </div>
      <figure className="home-lead-media">
        <div className="home-lead-images">{t(slides.map((s,i)=><img key={s.image} src={s.image} alt={t(i===slide?s.caption:'')} aria-hidden={i!==slide} className={i===slide?'visible':''} fetchPriority={i===0?'high':'auto'}/>))}</div>
        <figcaption><span aria-live="polite">{t(slides[slide].caption)}</span><div><span>{t(slide+1)}{t(" / ")}{t(slides.length)}</span><button aria-label={t("Previous featured image")} onClick={()=>setSlide((slide+2)%3)}><ArrowLeft size={18}/></button><button aria-label={t("Next featured image")} onClick={()=>setSlide((slide+1)%3)}><ArrowRight size={18}/></button></div></figcaption>
      </figure>
    </section>

    <section className="home-inventory home-section">
      <div className="home-section-heading"><div><span className="home-kicker">{t("PROPERTY CATALOGUE")}</span><h2>{t("Explore rentals in the UAE")}</h2><p>{t("Monthly and yearly rental options. Confirm availability with the team.")}</p></div><Link className="home-text-link" to="/properties" go={go}>{t("All properties")}<ArrowUpRight size={18}/></Link></div>
      <nav className="home-types" aria-label={t("Browse by property type")}>{t(categories.map(c=><Link key={c.slug} to={'/properties/'+c.slug} go={go}>{t(c.label)}</Link>))}</nav>
      {t(properties.length ? <div className="property-grid">{t(properties.slice(0,6).map(p=><Card key={p.id} p={p} go={go} saved={saved.includes(p.id)} toggleSave={toggleSave}/>))}</div> : <div className="home-empty"><h3>{t("No homes listed at the moment.")}</h3><p>{t("Contact us with your preferred neighbourhood and budget.")}</p><Link className="home-text-link" to="/contact" go={go}>{t("Speak to our team")}<ArrowUpRight size={17}/></Link></div>)}
    </section>

    <section className="home-viewing-guide home-section"><img src="/assets/one-bhk.webp" alt={t("Living room with space to relax")} loading="lazy"/><div><span className="home-kicker">{t("FROM SEARCH TO VIEWING")}</span><h2>{t("See the details.")}<br/>{t("Then see it in person.")}</h2><p>{t("Compare rental prices, apartment sizes and furnishing before you visit. Save the homes that suit you and send the team your preferred viewing date.")}</p><ol><li>{t("Choose an area and set your budget.")}</li><li>{t("Review photos, prices and availability.")}</li><li>{t("Request a viewing with the rental team.")}</li></ol><Link className="home-primary" to="/properties" go={go}>{t("Browse apartments")}<ArrowUpRight size={18}/></Link></div></section><section className="renter-tools home-section" aria-label={t("Rental tools")}><div><h2>{t("Your rental search, all in one place.")}</h2><p>{t("Keep a shortlist, compare the details and contact the team when you are ready.")}</p></div><div className="renter-tool-links"><Link to="/properties?saved=true" go={go}><span>{t("Saved homes")}</span><p>{t("Return to the properties you have saved.")}</p><ArrowUpRight size={22}/></Link><Link to="/properties" go={go}><span>{t("Find your rental")}</span><p>{t("Filter by price, furnishing and move-in date.")}</p><ArrowUpRight size={22}/></Link><Link to="/contact" go={go}><span>{t("Arrange a viewing")}</span><p>{t("Share a reference and speak to our team.")}</p><ArrowUpRight size={22}/></Link></div></section>

    <section className="home-communities home-section">
      <div className="home-community-intro"><span className="home-kicker">{t("NEIGHBOURHOODS")}</span><h2>{t("Start with")}<br/>{t("the location.")}</h2><p>{t("See where properties are listed, then narrow your search to the area that suits you.")}</p><Link className="home-text-link" to="/areas" go={go}>{t("Explore all areas")}<ArrowUpRight size={18}/></Link><figure><img src="/assets/muwaileh-neighbourhood.webp" alt={t("Residential buildings and a neighbourhood street")} loading="lazy"/><figcaption>{t("Residential setting. Individual listing locations vary.")}</figcaption></figure></div>
      <div className="home-community-list">{t(areas.map(a=>{const count=properties.filter(p=>p.area===a.name).length;return <Link key={a.id||a.name} to={'/properties?area='+encodeURIComponent(a.name)} go={go}><span><small>{t(a.emirate)}</small><h3>{t(a.name)}</h3></span><span>{t(count?`${count} ${count===1?'listing':'listings'}`:'No current listings')}<ArrowUpRight size={19}/></span></Link>}))}{t(!areas.length&&<p>{t("Contact us about your preferred area.")}</p>)}</div>
    </section>

    <section className="home-help home-section"><div><span className="home-kicker">{t("RENTAL QUESTIONS")}</span><h2>{t("Before you book")}<br/>{t("a viewing.")}</h2><p>{t("A few details to help you plan your search.")}</p></div><div>{t([
      ['How do I arrange a viewing?', 'Open the property and send a viewing request, or contact us with its reference number. The team will confirm the arrangements.'],
      ['Can I compare monthly and yearly prices?', 'Yes. Use the rental period selector to see the listed price for each period. Confirm the payment schedule and agreement for the home you choose.'],
      ['Are utilities and deposits included?', 'These depend on the property. Ask the team to confirm the deposit, utilities and any additional fees before committing.'],
      ['How does the move-in date filter work?', 'It shows homes with a listed availability date on or before your chosen date. Homes without a confirmed date are excluded from date-filtered results.'],
    ].map(([q,a])=><details key={q}><summary>{t(q)}<span>{t("+")}</span></summary><p>{t(a)}</p></details>))}</div></section>

    <section className="home-enquiry"><div><span className="home-kicker">{t("SPEAK TO HOLIDAYZONE")}</span><h2>{t("Have a home in mind?")}</h2><p>{t("Send us the reference, your budget and your planned move-in date.")}</p></div><Link className="home-primary" to="/contact" go={go}>{t("Arrange a viewing")}<ArrowUpRight size={19}/></Link></section>
  </main>
}
