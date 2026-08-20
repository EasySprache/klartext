# Klartext MVP Presentation UI

This is the MVP UI for our final project presentation. It builds upon the focus mode concepts to provide a cognitive accessibility-first experience.

## Overview

This UI transforms the standard dashboard into a guided conversation:

- **Single page flow** — Simplification stays on one page
- **Privacy page** — Public policy at `/privacy` for Chrome Web Store and footer links
- **Imprint page** — Public Impressum at `/impressum` (placeholders until a responsible person is named)
- **Progressive disclosure** — Sections reveal one at a time
- **Clear action language** — Buttons say exactly what they do
- **Input always visible** — Users can scroll up to see what they wrote

## Quick Start

### Prerequisites

- Node.js (v18+)
- The backend API running on port 8000 (see main project README)

### Run the UI

```bash
cd apps/web-mvp

# 1. Install dependencies (first time only)
npm install

# 2. Start the development server
npm run dev
```

Open **http://localhost:5174/** in your browser.

Privacy policy (public page for Chrome Web Store): **http://localhost:5174/privacy**

Imprint (Impressum): **http://localhost:5174/impressum** — fill in name, address, and email in `src/lib/imprint.ts` before going live.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL. Set this to point to a different backend (e.g., production, staging). |

**Example: Connect to production API**

```bash
VITE_API_URL=https://klartext-api.fly.dev npm run dev
```

Or create a `.env` file:

```env
VITE_API_URL=https://klartext-api.fly.dev
```

### Run the Backend (required for simplification)

In a **separate terminal**:

```bash
cd services/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Important**: The backend must be running for the frontend to work.

## Features

| Feature | Status |
|---------|--------|
| Language selection (EN/DE) | ✅ |
| PDF upload | ✅ |
| Text paste input | ✅ |
| Text simplification | ✅ |
| Copy to clipboard | ✅ |
| Read aloud (TTS) | ✅ |
| Accessibility panel | ✅ |
| Progress indicator | ✅ |

## Design Decisions

1. **No difficulty selector** — Hardcoded to "easy" level for simplicity
2. **Large buttons** — Minimum 180px wide with icons + text labels
3. **Soft colors** — Cream background, navy/teal accents
4. **Accessible fonts** — Atkinson Hyperlegible (body), Lexend (headings)

## File Structure

```
src/
├── App.tsx                    # Main progressive flow
├── main.tsx                   # Entry point with providers
├── index.css                  # Design tokens (copied from main app)
├── pages/
│   ├── PrivacyPage.tsx        # Public privacy policy at /privacy
│   └── ImprintPage.tsx        # Public Impressum at /impressum
├── components/
│   ├── AccessibilityPanel.tsx # Font size, spacing, contrast settings
│   ├── Footer.tsx
│   ├── ImprintContent.tsx
│   ├── PrivacyPolicyContent.tsx
│   ├── ProgressIndicator.tsx  # Step 1-2-3-4 indicator
│   └── ui/                    # shadcn-style components
├── contexts/
│   ├── LanguageContext.tsx    # EN/DE translations
│   └── AccessibilityContext.tsx
└── lib/
    ├── imprint.ts             # Impressum name, address, email placeholders
    └── utils.ts               # Tailwind class helper
```
