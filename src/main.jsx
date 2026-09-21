import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './Site'
import { LanguageProvider } from './i18n'
import './design.css'
import './reference-theme.css'
import './assistant.css'
import './landing.css'
import './marketplace.css'
import './languages.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider><App /></LanguageProvider>
  </React.StrictMode>,
)
