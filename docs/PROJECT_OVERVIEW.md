# KlarText Project Overview

> A text simplification library that transforms complex German and English text into easy-to-understand language with optional text-to-speech output.

## Introduction

KlarText is an accessibility-focused application designed to help users who struggle with complex text. This includes people with:

- Reading or cognitive difficulties
- Dyslexia
- Non-native language speakers
- Anyone who needs simpler, clearer text

The system takes dense bureaucratic, legal, medical, or technical text and transforms it into plain language while preserving the original meaning.

**Important:** KlarText produces "easy language" simplifications. It is **not** certified "Leichte Sprache" (official German easy language standard) and does not guarantee legal, medical, or financial accuracy.

---

## Core Features

### Text Simplification
- Transforms complex text into easy-to-understand language
- Supports German (`de`) and English (`en`)
- Three simplification levels:
  - **very_easy**: 8-10 word sentences, defines uncommon terms, bullet points
  - **easy**: 12-15 word sentences, clear structure, minimal jargon
  - **medium**: Plain language with normal sentence length

### PDF Ingestion
- Upload PDF documents for text extraction
- Automatic header/footer removal
- Handles multi-page documents
- Text cleanup and normalization

### Text-to-Speech (TTS)
- Converts simplified text to audio using gTTS
- Supports German and English voices
- Returns base64-encoded MP3 audio
- Text preprocessing for better punctuation handling

### Accessibility-First UI
- Large, readable fonts (18-20px base)
- High contrast mode support
- Keyboard navigation
- Screen reader compatible
- Dyslexia-friendly font option
- Reduced motion support

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  web-mvp    │    │   demo      │    │  extension  │         │
│  │ (React/Vite)│    │(Gradio Test)│    │  (Chrome)   │         │
│  │ Production  │    │   Staging   │    │  Optional   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Endpoints                            │   │
│  │  /v1/simplify  │  /v1/ingest/pdf  │  /v1/tts  │ /healthz │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core Modules                          │   │
│  │  llm_adapter.py  │  pdf_extractor.py  │  tts_adapter.py │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌───────────┐     ┌───────────┐      ┌───────────┐
    │   Groq    │     │  PyMuPDF  │      │   gTTS    │
    │   (LLM)   │     │   (PDF)   │      │  (Audio)  │
    └───────────┘     └───────────┘      └───────────┘
```

---

## Project Structure

```
klartext/
├── apps/
│   ├── web-mvp/              # Production React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── App.tsx       # Main application
│   │   │   ├── components/   # UI components
│   │   │   └── contexts/     # React contexts (language, accessibility)
│   │   └── package.json
│   ├── demo/                 # Testing/staging Gradio application
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── extension/            # Chrome extension (optional)
│   └── deprecated/           # Previous frontend experiments
│       └── accessible-word-craft-main/  # v1 frontend
│
├── services/
│   └── api/                  # FastAPI backend
│       ├── app/
│       │   ├── main.py       # API endpoints
│       │   └── core/
│       │       ├── llm_adapter.py     # LLM integration (Groq)
│       │       ├── pdf_extractor.py   # PDF text extraction
│       │       ├── tts_adapter.py     # Text-to-speech
│       │       └── prompts.py         # Prompt template loading
│       ├── requirements.txt
│       └── Dockerfile
│
├── prompts/
│   └── templates/
│       ├── v1/               # Version 1 prompts
│       └── v2/               # Version 2 prompts (current)
│           ├── system_prompt_de.txt
│           ├── system_prompt_en.txt
│           ├── user_prompt_de.txt
│           └── user_prompt_en.txt
│
├── docs/                     # Documentation
├── notebooks/                # Jupyter notebooks for exploration
├── data/                     # Sample texts and benchmarks
└── scripts/                  # Utility scripts
```

---

## API Reference

### Base URL
```
http://localhost:8000
```

### Endpoints

#### `POST /v1/simplify`
Simplify text into easy language.

**Request:**
```json
{
  "text": "Der Antragsteller muss die Unterlagen einreichen.",
  "target_lang": "de",
  "level": "easy"
}
```

**Response:**
```json
{
  "simplified_text": "Sie müssen Papiere abgeben.",
  "key_points": [],
  "warnings": []
}
```

#### `POST /v1/ingest/pdf`
Extract text from a PDF file.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "extracted_text": "...",
  "pages": 5,
  "warnings": []
}
```

#### `POST /v1/tts`
Convert text to speech audio.

**Request:**
```json
{
  "text": "Hallo, das ist ein Test.",
  "lang": "de"
}
```

**Response:**
```json
{
  "audio_base64": "//OExAAAA...",
  "audio_url": null,
  "format": "mp3"
}
```

#### `GET /healthz`
Health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for web-mvp frontend)
- [Groq API key](https://console.groq.com/keys)

### 1. Start the API Server

```bash
cd services/api
cp env.example .env
# Edit .env and add your GROQ_API_KEY

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Web Frontend

```bash
cd apps/web-mvp
npm install
npm run dev
```

### 3. Open in Browser

- **Web App:** http://localhost:5173 (or 5174)
- **API Docs:** http://localhost:8000/docs

---

## Environment Variables

### Backend (`services/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for LLM |
| `APP_PASSWORD` | No | Password for production access |
| `API_KEY` | No | API key for production auth |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) |
| `ENVIRONMENT` | No | `development` or `production` |

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python, FastAPI, Uvicorn |
| **LLM** | Groq (llama-3.1-8b-instant) |
| **PDF Extraction** | PyMuPDF |
| **TTS** | gTTS (Google Text-to-Speech) |
| **Deployment** | Docker, Fly.io (backend), Vercel (frontend) |

---

## Key Design Decisions

### No File Storage for TTS
Audio is generated in-memory and returned as base64. No audio files are stored on disk, simplifying deployment and avoiding storage management.

### Prompt Templates
System and user prompts are stored as separate text files in `prompts/templates/`. This allows:
- Easy iteration on prompts without code changes
- Version control for prompt evolution
- Language-specific prompts (DE/EN)

### Accessibility First
The UI is designed with accessibility as a core requirement:
- Semantic HTML with proper ARIA labels
- Visible focus indicators
- Keyboard navigation support
- Configurable text size and contrast

### Graceful Degradation
- TTS falls back to browser speech synthesis if API fails
- PDF extraction handles corrupted/password-protected files gracefully
- LLM errors return helpful error messages

---

## Related Documentation

- [API Design](api_design.md) - Detailed API specification
- [TTS Integration](tts_integration_plan.md) - Text-to-speech implementation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Security](SECURITY.md) - Security considerations

---

## License

Non-commercial use only. See [LICENSE](../LICENSE) for details.

**Attribution required:** "Based on work from the KlarText Team (2025)."

For commercial licensing inquiries, contact a repository administrator.
