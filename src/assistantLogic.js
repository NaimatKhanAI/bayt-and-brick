import { supportsPeriod } from './rentalPeriod.js'
export function answerQuestion(raw, properties, areas) {
  const text = raw.toLowerCase().trim()
  if (/viewing|visit|book|appointment|dekhna/.test(text)) return { text: 'Choose a home and use its viewing form, or contact our team. Your appointment is confirmed only after the team follows up.', contact: true }
  if (/deposit|fees|utilities|contract|documents/.test(text)) return { text: 'Deposits, utilities, fees and required documents depend on the home. Our team can confirm the exact terms before you arrange a viewing.', contact: true }
  const type = /studio/.test(text) ? 'studio' : /(?:1|one)\s*(?:bhk|bed)/.test(text) ? '1-bhk' : /(?:2|two)\s*(?:bhk|bed)/.test(text) ? '2-bhk' : /\b([3-8])\s*(?:bhk|bed)/.test(text) ? text.match(/\b([3-8])\s*(?:bhk|bed)/)[1] + '-bhk' : ''
  const amount = text.match(/(?:under|below|up to|max(?:imum)?|budget(?: is)?|aed)\s*(?:aed\s*)?([\d,]+(?:\.\d+)?)\s*(k)?/)
  const max = amount ? Number(amount[1].replaceAll(',', '')) * (amount[2] ? 1000 : 1) : null
  const period = /year|annual/.test(text) ? 'yearly' : 'monthly'
  const furnished = /unfurnished|bina furniture/.test(text) ? 'false' : /furnished|furniture/.test(text) ? 'true' : ''
  const area = areas.find(a => text.includes(a.name.toLowerCase()))?.name || ''
  if (!type && max === null && !furnished && !area && !/homes|properties|apartments|ghar/.test(text)) return { text: 'I can match listed homes by area, budget and furnishing, or help you request a viewing. Try ?furnished studio under AED 2,000? or ?1 BHK in Muwaileh?.' }
  const matches = properties.filter(p => supportsPeriod(p,period) && (!type || p.slug === type) && (max === null || (period === 'yearly' ? p.yearlyPrice : p.price) <= max) && (!area || p.area === area) && (!furnished || String(p.furnished) === furnished)).sort((a,b)=>(period === 'yearly' ? a.yearlyPrice-b.yearlyPrice : a.price-b.price))
  const query = new URLSearchParams({type, area, period, furnished, ...(max === null ? {} : {max: String(max)})})
  return { text: matches.length ? `Found ${matches.length} matching ${matches.length === 1 ? 'home' : 'homes'}. Prices shown are per ${period === 'yearly' ? 'year' : 'month'}. Confirm availability with our team; sample listings are previews.` : 'No listed homes match those preferences. Try a higher budget or a different area, or speak with our team.', matches: matches.slice(0,3), url: '/properties?' + query, period, contact: !matches.length }
}
