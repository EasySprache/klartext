# KlarText

KlarText turns dense German or English text into easy-to-understand language and can read it aloud. It’s built for people who get overwhelmed by long sentences, legal/bureaucratic phrasing, or technical language.

> **Important:** KlarText produces “easy language” / plain-language simplifications. It is **not** certified “Leichte Sprache” and does not guarantee legal/medical accuracy.

## What it does (MVP)
- Paste text → get an easy-to-read version (DE/EN)
- Upload a PDF → extract text → simplify it
- Optional **Text-to-Speech (TTS)** for the simplified text
- No login required (MVP)

Stretch (optional):
- Paste a URL → extract main article text → simplify
- Chrome extension: simplify selected text or the current page

## Architecture
```mermaid
flowchart LR
  U[User] -->|Paste text<br/>Upload PDF<br/>Enter URL| WEB[Web UI<br/>Next.js]
  WEB -->|REST| API[API<br/>FastAPI]
  API --> INGEST[Ingestion]
  INGEST --> CHUNK[Chunking]
  CHUNK --> LLM[LLM Adapter]
  LLM --> SIMP[Simplified Text]
  SIMP -->|optional| TTS[TTS Provider]
  API --> WEB
  TTS --> API
```

**Components:**
- **Ingestion** — Extract text from PDF, pasted text, or URL
- **Chunking** — Split long texts, ensure no hallucinations
- **LLM Adapter** — Configurable provider (OpenAI, Azure, Groq, Google)
- **TTS Provider** — Text-to-speech for audio output

## Tech stack (recommended)
- **Frontend:** Next.js (React), TypeScript, Tailwind (or vanilla CSS), accessible UI patterns
- **Backend:** Python + FastAPI + Uvicorn
- **LLM:** configurable provider via an adapter layer
- **PDF extraction:** PyMuPDF or pdfplumber
- **URL extraction (stretch):** trafilatura or readability-lxml
- **Rate limiting / caching (optional):** Redis
- **Storage (optional):** Postgres (metrics/logging) + local file storage in dev

## API overview
Base path: `/v1`

- `POST /v1/simplify`
  - Input: `{ text, target_lang: "de"|"en", level: "very_easy"|"easy"|"medium" }`
  - Output: `{ simplified_text, warnings?: string[] }`

- `POST /v1/ingest/pdf`
  - Input: `multipart/form-data` with `file`
  - Output: `{ extracted_text, pages, warnings?: string[] }`

- `POST /v1/ingest/url` (stretch)
  - Input: `{ url }`
  - Output: `{ extracted_text, title?, warnings?: string[] }`

- `POST /v1/tts`
  - Input: `{ text, lang: "de"|"en" }`
  - Output: `{ audio_url | audio_base64 }`

- `GET /healthz`

### Swagger / OpenAPI docs
Swagger UI: **(TBD link)**

## Quick start (local dev)
### 1) Prereqs
- Docker + Docker Compose

### 2) Configure env
Copy the example env file:
```bash
cp .env.example .env
```
Then set your LLM/TTS provider keys (see comments inside `.env.example`).

### 3) Run
```bash
docker compose up --build
```

### 4) Open
- Web: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Repo layout
- `apps/web` – Web UI
- `services/api` – API service
- `apps/extension` – Chrome extension (optional track)
- `prompts` – prompt templates + eval fixtures
- `docs` – architecture notes + screenshots

## Design reference
Lovable prototype: https://lovable.dev/projects/7d82e6e7-3919-4389-9b79-30543806c5e0

## License
Usage & Licensing Notice (Non-Commercial)
This project, including all code, models, datasets, documentation, and related materials, is provided for personal, educational, and non-commercial research use only.

Allowed
Personal use
Academic and non-commercial research
Forking and modifying for non-commercial purposes
Contributing via pull requests
Not Allowed
Any commercial use
Selling or monetizing the software, models, datasets, or outputs
Using the project in products or services that generate revenue
Use within commercial organizations without permission
Attribution
If you share or publish derivative work, you must provide credit to:

Based on work from the KlarText Team (2025).

Commercial Licensing
To request commercial usage rights, contact a repository administrator.
