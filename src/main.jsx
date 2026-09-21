import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './Site'
import './design.css'
import './reference-theme.css'
import './assistant.css'
import './landing.css'
import './marketplace.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
