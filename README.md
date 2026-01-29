# KlarText

KlarText turns dense German or English text into easy-to-understand language and can read it aloud. It's built to bring easy language to everyone.

> **Important:** KlarText produces “easy language” / plain-language simplifications. It is **not** certified “Leichte Sprache” and does not guarantee legal/medical accuracy.

## Introduction

KlarText is an accessibility-focused application designed to help users who struggle with complex text. This includes people with:

- Reading or cognitive difficulties
- Dyslexia
- Non-native language speakers
- Anyone who needs simpler, clearer text

The system takes dense bureaucratic, legal, medical, or technical text and transforms it into plain language while preserving the original meaning.


**Quick Start:**
```bash
# First time setup:
cd services/api
cp env.example .env
# Edit .env and add your GROQ_API_KEY

# Terminal 1: API
cd services/api && uvicorn app.main:app --reload --port 8000

# Terminal 2: Demo
cd apps/demo && python app.py

# Open: http://localhost:7860
```

See `docs/phase_0_testing_guide.md` for detailed setup instructions.

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

### Browser Extension
- Chrome extension for in-page simplification
- Simplify selected text or entire pages
- Side panel interface for easy access
- Real-time processing with progress indicators

### Quality Monitoring & Feedback Loop
- Automatic quality scoring (readability, sentence length, meaning preservation)
- JSONL logging for performance tracking and analysis
- Metrics collection for continuous improvement
- Evaluation framework for model and prompt optimization

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   web-mvp    │    │     demo     │    │  extension   │        │
│  │   (React)    │    │   (Gradio)   │    │   (Chrome)   │        │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘        │
└─────────┼───────────────────┼───────────────────┼────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │ REST API
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Endpoints                             │  │
│  │ /v1/simplify(/batch) │ /v1/ingest/pdf │ /v1/tts │ /log-run │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Core Logic & Assets                     │  │
│  │  llm_adapter.py  │  pdf_extractor.py  │  tts_adapter.py    │  │
│  │  run_logger.py   │  prompts.py        │  Live Prompts      │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │   Groq    │       │  PyMuPDF  │       │   gTTS    │
    │   (LLM)   │       │   (PDF)   │       │  (Audio)  │
    └─────┬─────┘       └───────────┘       └───────────┘
          │
    ┌─────▼──────┐
    │ Logs (JSONL)│
    └─────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python, FastAPI, Uvicorn |
| **LLM** | Groq (llama-3.1-8b-instant) |
| **PDF Extraction** | PyMuPDF |
| **TTS** | gTTS (v2), OpenAI TTS (optional) |
| **Telemetry** | JSONL, python-json-logger, Metrics Scripts |
| **Deployment** | Docker, Fly.io (backend), Vercel (frontend) |

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
Swagger UI: **http://localhost:8000/docs** (when API is running)  
ReDoc: **http://localhost:8000/redoc**  
OpenAPI JSON: **http://localhost:8000/openapi.json**

## Quick start (local dev)
### 1) Prereqs
- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com/keys)

### 2) Backend Setup
```bash
cd services/api
cp env.example .env
# Edit .env and add your GROQ_API_KEY

# Install dependencies
pip install -r requirements.txt

# Run API server
uvicorn app.main:app --reload --port 8000
```

### 3) Frontend Setup
```bash
cd apps/web-mvp
npm install
npm run dev
```

### 4) Open
- Web: http://localhost:8080
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Environment Variables

### Backend (`services/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for LLM calls |
| `APP_PASSWORD` | No | Password for frontend access control |
| `ALLOWED_ORIGINS` | No | CORS origins (defaults to localhost) |
| `ENVIRONMENT` | No | `development` or `production` |

### Frontend (`apps/web-mvp/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API URL |

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full deployment instructions.

**Quick overview:**
- **Frontend**: Deploy to [Vercel](https://vercel.com) (set root to `apps/web-mvp`)
- **Backend**: Deploy to [Fly.io](https://fly.io) (uses existing Dockerfile)

```bash
# Deploy backend to Fly.io
cd services/api
fly launch --no-deploy
fly secrets set GROQ_API_KEY=your_key ALLOWED_ORIGINS=https://your-app.vercel.app
fly deploy
```

## Project Structure

```
klartext/
├── apps/
│   ├── web-mvp/              # Production React frontend
│   ├── demo/                 # Testing/staging Gradio app
│   └── extension/            # Chrome extension
├── services/api/             # FastAPI backend
├── prompts/                  # Prompt templates & versioning
├── data/                     # Benchmarks, samples, logs
├── notebooks/                # Evaluation & research
└── docs/                     # Documentation
```

## Running Locally

### Web Application
See [apps/web-mvp/README.md](apps/web-mvp/README.md) for detailed setup and development instructions.

### Chrome Extension
See [apps/extension/README.md](apps/extension/README.md) for extension installation and testing guide.

### Demo/Testing Environment
See [apps/demo/README.md](apps/demo/README.md) for Gradio demo setup.

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

## Documentation

### Core Documentation
- **[docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** - Comprehensive project documentation
- **[docs/api_design.md](docs/api_design.md)** - Full API specification
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security considerations
- **[agent.md](agent.md)** - Developer conventions

### Research & Analysis
- **[notebooks/README.md](notebooks/README.md)** - Jupyter notebooks for evaluation and scoring
- **[data/README.md](data/README.md)** - Datasets, benchmarks, and test samples
- **outputs/** - Analysis reports and model comparisons

## License

This project is for non-commercial use only. See [LICENSE](LICENSE) for full terms.

For commercial licensing inquiries, contact a repository administrator.
