import { Phone, MessageCircle } from 'lucide-react'
import { useLanguage } from './i18n'

export default function PropertyContact({ property }) {
  const { t } = useLanguage()
  const call = property.showCallButton !== false
  const whatsapp = property.showWhatsappButton !== false
  if (!call && !whatsapp) return null
  const message = `Hello Holidayzone, I am interested in ${property.name}.\nReference: ${property.reference}\n${location.origin}/property/${encodeURIComponent(property.id)}`
  return <div className="property-contact-buttons">
    {call && <a href="tel:+971543592223" aria-label={t('Call 0543592223')}><Phone size={16}/>{t('Call')}</a>}
    {whatsapp && <a href={'https://wa.me/971509794499?text=' + encodeURIComponent(message)} target="_blank" rel="noopener noreferrer" aria-label={t('WhatsApp 0509794499 (opens in a new tab)')}><MessageCircle size={16}/>{t('WhatsApp')}</a>}
  </div>
}
