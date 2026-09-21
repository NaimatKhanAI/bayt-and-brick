import { ArrowUpRight } from 'lucide-react'
import { Link } from './shared'
import './about.css'

export function About({ go, areas = [], properties = [] }) {
  const communities = areas.map(area => ({
    ...area,
    count: properties.filter(property => property.area === area.name).length,
  })).filter(area => area.count > 0)

  return (
    <main className="about-business">
      <header className="about-business-heading">
        <nav aria-label="Breadcrumb"><Link to="/" go={go}>Home</Link><span>/</span><span>About us</span></nav>
        <div className="about-business-title">
          <h1>About Holidayzone</h1>
          <p>Residential rentals in the UAE.<br />Property search, enquiries and viewing support.</p>
        </div>
      </header>

      <figure className="about-business-photo">
        <img src="/assets/hero-apartment.webp" alt="Apartment living room with a dining area and large windows" fetchPriority="high" />
        <figcaption><span>HOLIDAYZONE</span><span>Residential rentals / United Arab Emirates</span></figcaption>
      </figure>

      <div className="about-business-body">
        <article className="about-business-profile">
          <span className="about-business-label">THE BUSINESS</span>
          <h2>Helping you find your next rental.</h2>
          <p className="about-business-lead">Holidayzone brings residential listings and rental enquiries together, so you can compare homes and contact the team about the ones that interest you.</p>
          <p>Our catalogue includes studios and apartments, with monthly and yearly rental prices. You can search by neighbourhood, budget, furnishing and move-in date, then save a shortlist to review.</p>
          <p>If you would like to see a property, send us its reference number. We can discuss the details and arrange the next step. Availability, deposits, utilities and payment terms should be confirmed for the individual home before you commit.</p>
          <Link className="about-business-link" to="/properties" go={go}>Explore the property catalogue <ArrowUpRight size={18} /></Link>
        </article>

        <aside className="about-business-contact" aria-labelledby="about-contact-heading">
          <span className="about-business-label">RENTAL ENQUIRIES</span>
          <h2 id="about-contact-heading">Contact our team</h2>
          <p>Have a property reference or an area in mind? Get in touch.</p>
          <dl>
            <div><dt>Call</dt><dd><a href="tel:+971543592223">054 359 2223 <ArrowUpRight size={17} /></a></dd></div>
            <div><dt>WhatsApp</dt><dd><a href="https://wa.me/971509794499" target="_blank" rel="noopener noreferrer">050 979 4499 <ArrowUpRight size={17} /></a></dd></div>
          </dl>
          <Link className="about-business-enquiry" to="/contact" go={go}>Send an enquiry <ArrowUpRight size={17} /></Link>
          <p className="about-business-note">Include your budget and planned move-in date so we can understand your requirements.</p>
        </aside>
      </div>

      <section className="about-business-areas" aria-labelledby="about-areas-heading">
        <div className="about-business-areas-heading">
          <div><span className="about-business-label">OUR CATALOGUE</span><h2 id="about-areas-heading">Browse by neighbourhood</h2></div>
          <Link className="about-business-link" to="/areas" go={go}>All neighbourhoods <ArrowUpRight size={17} /></Link>
        </div>
        {communities.length ? <div className="about-business-area-list">{communities.map(area => (
          <Link key={area.id || area.name} to={'/properties?area=' + encodeURIComponent(area.name)} go={go}>
            <span><strong>{area.name}</strong><small>{area.emirate}</small></span>
            <span className="about-business-area-count">{area.count} {area.count === 1 ? 'listing' : 'listings'} <ArrowUpRight size={18} /></span>
          </Link>
        ))}</div> : <p>No homes are currently listed. Contact us with your preferred neighbourhood.</p>}
        <p className="about-business-note">Counts reflect the current catalogue. Please confirm availability with the team; sample listings are labelled on the property pages.</p>
      </section>
    </main>
  )
}
