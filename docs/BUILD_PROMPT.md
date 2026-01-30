# KlarText Overview
KlarText is an accessibility-first tool that turns dense German/English text (pasted text, PDFs, and optionally web pages) into easy-to-understand language and can read it aloud.

## Persona (primary)
- Person with reading/cognitive difficulties.
- Can read, but gets overwhelmed by long sentences, legal/bureaucratic phrasing, and technical terms.
- Needs short, simple explanations, clear structure, and optional text-to-speech.
- Constraints: wants it fast, free to try, and without creating an account.

## Problem
Websites and documents often use complex language that excludes people with cognitive impairments, low literacy, dyslexia, seniors, and non-native speakers. Existing “Leichte Sprache” solutions can be expensive and slow (often manual/certified). Users need something immediate.

## MVP goal
Build a web prototype that:
1) accepts pasted text and PDF uploads,
2) simplifies the content into “easy language” (NOT certified Leichte Sprache),
3) supports German + English,
4) optionally generates audio (TTS),
5) requires no login (at least in MVP).

## Non-goals (MVP)
- No certified “Leichte Sprache” guarantee.
- No browser extension requirement for MVP (can be a parallel track).
- No full-site crawling or large domain ingestion.
- No fine-tuned model training.
- No user accounts / payments in MVP.

## Core user flow (web)
1) User pastes text or uploads a PDF.
2) User selects how easy they want it: Very Easy / Easy / Medium.
3) User clicks “Make it easier”.
4) App shows simplified text + (optional) audio playback.
5) User can copy the result.

## Stretch goals
- URL ingestion (extract main article text from a webpage).
- Chrome extension: “Simplify this page” by sending selected text / page content to API.
- HTML accessibility checks: flag common readability/accessibility issues, provide suggestions.

## Functional requirements
- Input:
  - pasted text (German/English) up to “considerable size” via chunking
  - PDF upload (extract text; warn if image-only / empty)
  - optional URL: extract main content (article text) with robust boilerplate removal
- Output:
  - simplified text in requested difficulty level
  - preserve meaning; avoid hallucinating facts; if something is unclear, say so
  - optionally provide a short “key points” list at top
- TTS:
  - generate audio for simplified text in the correct language
  - return a playable audio URL or base64 blob
- Reliability:
  - chunking + recombination strategy
  - rate limiting (per IP) to prevent abuse
  - consistent error messages + loading states
- Accessibility:
  - keyboard-only navigation
  - screen-reader friendly structure (semantic HTML, ARIA where needed)
  - high contrast option, font size control, dyslexia-friendly font option, line spacing toggle
  - no distracting animation

## Quality bar / acceptance criteria
- Paste a dense paragraph (DE/EN) -> returns simplified version within a few seconds.
- Upload a PDF with real text -> returns simplified version.
- Long inputs are handled via chunking without dropping content.
- TTS produces audio for the simplified text.
- UI is usable by keyboard only; focus states visible.
- Basic API docs exposed via Swagger (OpenAPI).

## Suggested architecture (MVP)
- Frontend: Next.js (React) + Tailwind (or vanilla CSS) + accessible components
- Backend: FastAPI (Python) with endpoints for simplify, pdf, url, and tts
- LLM provider: configurable (OpenAI / Azure / Groq / etc.) behind a simple adapter
- Storage (optional): Postgres for logs/metrics + file storage for PDFs/audio (local in dev)
- Caching/rate limit: Redis (optional; can start in-memory for MVP)

## API endpoints (MVP)
- POST /v1/simplify
  body: { text, source_lang?, target_lang, level: very_easy|easy|medium }
- POST /v1/ingest/pdf
  multipart/form-data: file=pdf
  -> returns extracted text + metadata
- POST /v1/ingest/url (stretch)
  body: { url }
  -> returns extracted text + metadata
- POST /v1/tts
  body: { text, lang }
  -> returns audio url or base64
- GET /healthz

## Prompting guidelines (must follow)
- Output must be easy to read:
  - short sentences
  - common words
  - explain technical words if unavoidable
  - keep structure: headings + bullet points when helpful
  - do not add new facts
  - if input is legal/medical/financial, add a short “not advice” note
- Levels:
  - Very Easy: very short sentences; define anything uncommon; extra whitespace
  - Easy: short sentences; clear structure; minimal jargon
  - Medium: plain language; normal sentence length; less repetition

## Repo deliverables (what to create)
- React/Vite web app under apps/web-mvp (production)
- Gradio demo app under apps/demo (testing/staging)
- FastAPI service under services/api
- optional extension under apps/extension
- docker-compose for local dev
- OpenAPI/Swagger available at /docs

## Prototype link
The team can use the Lovable prototype as UI inspiration:
https://lovable.dev/projects/7d82e6e7-3919-4389-9b79-30543806c5e0
