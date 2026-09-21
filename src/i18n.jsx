import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { translations } from './translations'
import { malayalam } from './malayalam'
import { extraTranslations } from './translationExtras'

const LanguageContext = createContext(null)
export const languages = [['en', 'English'], ['ur', 'اردو'], ['ar', 'العربية'], ['ml', 'മലയാളം']]

export function translate(value, language) {
  if (typeof value !== 'string' || language === 'en') return value
  const key = value.trim().replace(/\s+/g, ' ')
  const translated = extraTranslations[key]?.[language] || (language === 'ml' ? malayalam[key] : translations[key]?.[language])
  if (translated) return value.replace(value.trim(), translated)
  const bhk = key.match(/^([1-8]) BHK( apartments)?$/)
  if (bhk) return language === 'ur' ? `${bhk[1]} بیڈ روم اپارٹمنٹ` : language === 'ml' ? `${bhk[1]} കിടപ്പുമുറി അപ്പാർട്ട്മെന്റ്` : `شقة ${bhk[1]} غرف نوم`
  const patterns = [
    [/^(\d+) (listing|listings)$/, n => `${n} ${translate('listings', language)}`],
    [/^(\d+) bathrooms$/, n => `${n} ${translate('Bathrooms', language)}`],
    [/^([\d,\-– ]+) sq ft$/, n => `${n} ${{ur:'مربع فٹ',ar:'قدم مربع',ml:'ചതുരശ്ര അടി'}[language]}`],
    [/^in (.+)$/, area => `${{ur:'میں',ar:'في',ml:'പ്രദേശം:'}[language]} ${translate(area, language)}`],
    [/^Move in by (.+)$/, date => `${translate('Move-in date', language)}: ${date}`],
    [/^From AED (.+)$/, amount => `${translate('Min price (AED)', language)}: ${amount}`],
    [/^Up to AED (.+)$/, amount => `${translate('Max price (AED)', language)}: ${amount}`],
    [/^From (.+) sq ft$/, size => `${translate('Minimum size (sq ft)', language)}: ${size}`],
    [/^Up to (.+) sq ft$/, size => `${translate('Maximum size (sq ft)', language)}: ${size}`],
    [/^View photo (\d+)$/, n => `${translate('Photos', language)} ${n}`],
    [/^Found (\d+) matching homes?\. Prices shown are per (month|year)\. Confirm availability with our team; sample listings are previews\.$/, (n,period) => `${n} ${translate('homes', language)} · ${translate(period === 'year' ? 'Yearly' : 'Monthly', language)}. ${translate('Sample listings are design previews. Confirm rental terms and availability with our team.', language)}`],
  ]
  for (const [pattern, format] of patterns) { const match = key.match(pattern); if (match) return format(...match.slice(1)) }
  return value
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { const saved = localStorage.getItem('holidayzone-language'); return languages.some(([code]) => code === saved) ? saved : 'en' } catch { return 'en' }
  })
  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = ['ur', 'ar'].includes(language) ? 'rtl' : 'ltr'
    try { localStorage.setItem('holidayzone-language', language) } catch { /* Language still works without storage. */ }
  }, [language])
  const value = useMemo(() => ({ language, setLanguage, t: text => translate(text, language) }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() { return useContext(LanguageContext) }

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  return <select className="language-selector" aria-label="Language / زبان / اللغة" value={language} onChange={event => setLanguage(event.target.value)} dir="ltr">
    {languages.map(([code, label]) => <option key={code} value={code} lang={code}>{label}</option>)}
  </select>
}
