import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './contexts/LanguageContext'
import { AccessibilityProvider } from './contexts/AccessibilityContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AccessibilityProvider>
  </StrictMode>,
)
