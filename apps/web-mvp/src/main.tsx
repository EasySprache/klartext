import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PrivacyPage } from './pages/PrivacyPage.tsx'
import { ImprintPage } from './pages/ImprintPage.tsx'
import { LanguageProvider } from './contexts/LanguageContext'
import { AccessibilityProvider } from './contexts/AccessibilityContext'

function Root() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const Page =
    path === '/privacy' ? PrivacyPage
    : path === '/impressum' || path === '/imprint' ? ImprintPage
    : App

  return (
    <AccessibilityProvider>
      <LanguageProvider>
        <Page />
      </LanguageProvider>
    </AccessibilityProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
