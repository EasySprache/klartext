# KlarText Frontend

Web UI for the KlarText text simplification service. Built with accessibility-first principles.

## Tech Stack

- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling

## Quick Start

### Prerequisites

- Node.js 18+
- Backend API running (see `services/api/README.md`)

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at http://localhost:8080 by default.

### Build

```bash
npm run build
```

Output is in the `dist/` directory.

## Environment Variables

Create a `.env.local` file for local development (optional):

```bash
# Backend API URL (defaults to http://localhost:8000)
VITE_API_URL=http://localhost:8000
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API URL |

## Deployment to Vercel

### 1. Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Set root directory to `accessible-word-craft-main`**

### 2. Configure Environment

Add environment variable in Vercel project settings:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-api.fly.dev` |

### 3. Deploy

Vercel auto-deploys on push to main branch.

## Features

- **Text Simplification** - Paste text or upload PDF
- **Multiple Difficulty Levels** - Very Easy, Easy, Medium
- **Bilingual** - German and English support
- **Accessibility** - High contrast, keyboard navigation, screen reader support
- **Text-to-Speech** - Listen to simplified text
- **Password Protection** - Optional access control via backend

## Project Structure

```
src/
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── PasswordGate.tsx    # Access control
│   ├── TranslationSection.tsx  # Main simplification UI
│   └── ...
├── contexts/          # React contexts
│   ├── AccessibilityContext.tsx
│   └── LanguageContext.tsx
├── pages/             # Page components
├── hooks/             # Custom hooks
└── lib/               # Utilities
```

## Accessibility

This app follows WCAG 2.1 AA guidelines:

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus indicators
- High contrast support
- Reduced motion support

## License

See LICENSE file in project root.
