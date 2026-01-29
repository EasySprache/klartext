# KlarText API Service

FastAPI-based REST API for text simplification with accessibility features.

## Implementation Status

✅ **Phase 0 Complete** - Core simplification endpoint is now working!

| Feature | Status | Notes |
|---------|--------|-------|
| `/v1/simplify` endpoint | ✅ **Implemented** | Uses Groq LLM with project prompt templates |
| Prompt template loading | ✅ **Implemented** | Loads from `prompts/templates/` |
| LLM integration | ✅ **Implemented** | Groq llama-3.1-8b-instant model |
| `/v1/ingest/pdf` | ✅ **Implemented** | PyMuPDF extraction with cleanup |
| `/v1/log-run` | ✅ **Implemented** | JSONL logging with file locking |
| `/v1/simplify/batch` | 📝 Placeholder | Endpoint defined, logic pending |
| `/v1/ingest/url` | 📝 Placeholder | Endpoint defined, logic pending |
| `/v1/tts` | 📝 Placeholder | Endpoint defined, logic pending |

**Next steps:** See `docs/phase_0_testing_guide.md` for connecting Gradio demo to the API.

## Quick Start

### 1. Install Dependencies

```bash
cd services/api
pip install -r requirements.txt
```

### 2. Configure Environment

**Copy the example environment file and add your API key:**

```bash
cd services/api
cp env.example .env
# Edit .env and add your GROQ_API_KEY
```

**Required:** Get your Groq API key from [console.groq.com/keys](https://console.groq.com/keys)

The `.env` file is automatically loaded when the API starts. Example contents:

```bash
# Required: LLM Provider
GROQ_API_KEY=gsk_your_actual_key_here

# Optional: TTS Provider (defaults to gTTS if not set)
TTS_PROVIDER=gtts
# OPENAI_API_KEY=your_openai_key_here  # for OpenAI TTS
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json  # for Google TTS

# Optional: Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:7860
```

**Note:** `.env` is in `.gitignore` and will not be committed. Never commit API keys to git.

### 3. Run the Server

```bash
# Development with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Access Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### 5. Test the API

**Using Swagger UI** (easiest):
1. Go to http://localhost:8000/docs
2. Find `POST /v1/simplify`
3. Click "Try it out"
4. Paste test text and click "Execute"

**Using curl**:
```bash
# Test German simplification
curl -X POST http://localhost:8000/v1/simplify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Der Antragsteller muss die erforderlichen Unterlagen einreichen.",
    "target_lang": "de",
    "level": "easy"
  }'

# Test English simplification
curl -X POST http://localhost:8000/v1/simplify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The implementation of aforementioned procedures requires comprehensive documentation.",
    "target_lang": "en",
    "level": "easy"
  }'
```

**Expected response**:
```json
{
  "simplified_text": "Sie müssen Papiere abgeben. Die Papiere sind wichtig...",
  "key_points": [],
  "warnings": []
}
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key for LLM | `gsk_...` |

### Security (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | API key for authenticating API requests | `abc123...` |
| `APP_PASSWORD` | Password for frontend access | `secure_pass_123` |
| `DEMO_PASSWORD` | (Optional) Temporary demo password | `demo_xyz_789` |
| `DEMO_END_AT` | (Optional) Demo password expiration time | `2026-02-01T18:00:00Z` |

**See [DEMO_SECURITY.md](./DEMO_SECURITY.md)** for complete security and demo management guide.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_PROVIDER` | `gtts` | TTS provider: `gtts`, `openai`, or `google` |
| `OPENAI_API_KEY` | - | OpenAI API key (for TTS) |
| `GOOGLE_APPLICATION_CREDENTIALS` | - | Path to Google Cloud credentials |
| `ENVIRONMENT` | `development` | Environment: `development`, `staging`, `production` |
| `LOG_LEVEL` | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `MAX_INPUT_LENGTH` | `40000` | Maximum input text length (characters) |
| `MAX_PDF_SIZE_MB` | `10` | Maximum PDF file size (MB) |
| `RATE_LIMIT_PER_MINUTE` | `30` | Rate limit for simplify endpoint |
| `LOG_RUNS_TO_FILE` | `true` | Enable run logging for feedback loop |
| `LOG_FILE_PATH` | `./data/run_logs.jsonl` | Path to run logs file |

## API Endpoints

### Core Endpoints

- `GET /healthz` - Health check
- `POST /v1/auth/verify` - Verify frontend access password
- `POST /v1/simplify` - Simplify a single text
- `POST /v1/simplify/batch` - Simplify multiple texts
- `POST /v1/ingest/pdf` - Extract text from PDF
- `POST /v1/ingest/url` - Extract text from URL
- `POST /v1/tts` - Convert text to speech
- `POST /v1/log-run` - Log run data for feedback loop

See full API documentation at `/docs` or in `docs/api_design.md`.

## Security & Demo Management

### Demo Password Setup

For demonstrations where you need to share temporary access:

```bash
# Quick setup (see DEMO_QUICKSTART.md)
fly secrets set DEMO_PASSWORD="$(openssl rand -base64 24)"
fly secrets set DEMO_END_AT="$(date -u -v+4H +%Y-%m-%dT%H:%M:%SZ)"  # 4-hour expiration
```

**⚠️ After demo - rotate secrets to invalidate captured keys:**

```bash
fly secrets set API_KEY="$(openssl rand -hex 32)"
fly secrets unset DEMO_PASSWORD
fly secrets unset DEMO_END_AT
```

**Documentation:**
- **Quick reference**: [DEMO_QUICKSTART.md](./DEMO_QUICKSTART.md) - Essential commands
- **Complete guide**: [DEMO_SECURITY.md](./DEMO_SECURITY.md) - Security best practices, troubleshooting, workflows

## Architecture

```
services/api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app & endpoints
│   └── core/                # ✅ Core business logic (IMPLEMENTED)
│       ├── __init__.py
│       ├── prompts.py       # ✅ Template loading (ported from demo)
│       └── llm_adapter.py   # ✅ LLM integration (Groq)
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container image
└── README.md               # This file
```

**Implementation Notes:**
- `core/prompts.py` loads prompt templates from `prompts/templates/` (system + user prompts)
- `core/llm_adapter.py` handles Groq API calls with proper error handling
- Ported working logic from `demo/app.py` to maintain consistency
- Future modules: `services/` (batch, PDF, TTS), `utils/` (scoring, chunking)

## TTS Provider Options

Multiple TTS providers are supported (best option TBD):

### gTTS (Default)
- **Pros**: Free, no setup, good for testing
- **Cons**: Lower quality, limited control
- **Setup**: No configuration needed

### OpenAI TTS
- **Pros**: High quality, simple API
- **Cons**: Paid ($15/1M chars)
- **Setup**: Set `TTS_PROVIDER=openai` and `OPENAI_API_KEY`

### Google Cloud TTS
- **Pros**: High quality, 380+ voices, SSML support
- **Cons**: Paid ($16/1M chars), complex setup
- **Setup**: Set `TTS_PROVIDER=google` and `GOOGLE_APPLICATION_CREDENTIALS`

## What's Implemented (Phase 0)

The core simplification pipeline is now working:

### Core Modules

**`app/core/prompts.py`**
- Loads system and user prompt templates from `prompts/templates/`
- Supports German (`de`) and English (`en`)
- Uses Handlebars templates with `{{text}}` placeholder
- Ported from working Gradio demo

**`app/core/llm_adapter.py`**
- Calls Groq API with `llama-3.1-8b-instant` model
- Temperature: 0.3 for consistent output
- Proper error handling for API failures
- Uses split message structure (system + user prompts)

**`app/main.py` - `/v1/simplify` Endpoint**
- ✅ Actually simplifies text (not a placeholder!)
- Input validation (max 5000 chars, language check)
- Error handling (400 for bad input, 500 for API errors)
- Returns simplified text in structured response

**`app/core/pdf_extractor.py`**
- Extracts text from PDF bytes using PyMuPDF
- Header/footer removal (configurable margin %)
- Text cleanup (de-hyphenation, whitespace normalization)
- Returns text, page count, and warnings

**`app/main.py` - `/v1/ingest/pdf` Endpoint**
- ✅ Extracts text from uploaded PDFs
- File size validation (max 10MB)
- Password-protected PDF detection
- Empty/corrupted PDF handling
- Multi-page support with per-page warnings

### How It Works

1. **Request**: Client sends text, target language, and level
2. **Template Loading**: System loads appropriate prompts for language
3. **LLM Call**: Text is sent to Groq with system + user messages
4. **Response**: Simplified text returned with metadata

### Testing Pipeline

See `docs/phase_0_testing_guide.md` for:
- Connecting Gradio demo to the API
- Side-by-side comparison (Direct LLM vs Via API)
- Validation checklist

## Development

### Running Tests

```bash
# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html
```

### Code Quality

```bash
# Format code
black app/

# Lint
ruff check app/

# Type checking
mypy app/
```

### Docker

```bash
# Build image
docker build -t klartext-api .

# Run container
docker run -p 8000:8000 --env-file .env klartext-api

# Or use docker-compose (from project root)
docker-compose up api
```

## Deployment

### Using Docker Compose (Recommended)

From project root:

```bash
docker-compose up --build
```

### Manual Deployment

1. Set environment variables (use secrets manager in production)
2. Install dependencies: `pip install -r requirements.txt`
3. Run with production server: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`

### Recommended Production Setup

- **Server**: Gunicorn + Uvicorn workers
- **Reverse Proxy**: Nginx or Caddy
- **SSL**: Let's Encrypt via Certbot
- **Process Manager**: Systemd or Supervisor
- **Monitoring**: Prometheus + Grafana
- **Logging**: Structured JSON logs to stdout → ELK/Loki

## Logging & Feedback Loop

The `/v1/log-run` endpoint collects privacy-preserving analytics for continuous improvement.

### Features

✅ **Privacy-preserving** - Only stores SHA256 hash of input text, not raw text
✅ **Non-blocking** - Asynchronous logging doesn't slow down app
✅ **File locking** - Safe concurrent writes with fcntl
✅ **Structured** - JSONL format for easy analysis
✅ **Frontend integration** - Automatic logging from web-mvp

### Quick Example

```typescript
// Frontend (automatic in web-mvp)
import { logSimplification } from '@/lib/logger';

await logSimplification({
  inputText: original,
  outputText: simplified,
  targetLang: 'de',
  level: 'easy',
  startTime: Date.now() - 1234
});
```

### Configuration

```bash
# Optional: Set log file location (default: ./data/logs/api_runs.jsonl)
export LOG_FILE_PATH="/path/to/logs/api_runs.jsonl"
```

### Log Entry Example

```json
{
  "run_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-01-27T14:30:00Z",
  "input_hash": "abc123def456...",
  "input_length": 150,
  "output_length": 120,
  "target_lang": "de",
  "level": "easy",
  "model_used": "llama-3.1-8b-instant",
  "latency_ms": 250,
  "chunk_count": 1,
  "scores": {"avg_sentence_len": 12.0, "word_count": 45},
  "warnings": [],
  "user_feedback": null
}
```

### Complete Documentation

See **[LOGGING_GUIDE.md](./LOGGING_GUIDE.md)** for:
- Architecture overview
- Frontend integration examples
- Privacy & security details
- Log analysis with Python/Jupyter
- Troubleshooting guide

## Troubleshooting

### "GROQ_API_KEY not set"

Make sure you've created a `.env` file with your API key:

```bash
echo "GROQ_API_KEY=your_key_here" > .env
```

### "Module not found" errors

Install dependencies:

```bash
pip install -r requirements.txt
```

### Dependency conflict warnings with Gradio

If you see warnings about FastAPI/Starlette version conflicts with Gradio 6.2.0:

```
gradio 6.2.0 requires fastapi>=0.115.2
```

This is expected and safe to ignore. The API requirements have been updated to be compatible with Gradio:
- `fastapi>=0.115.2` (instead of `==0.115.0`)
- `starlette>=0.40.0` (required by Gradio)
- `python-multipart>=0.0.18` (required by Gradio)

Both API and demo can coexist in the same virtual environment.

### CORS errors from frontend

Add your frontend URL to `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### PDF extraction fails

Make sure PyMuPDF is installed:

```bash
pip install pymupdf==1.24.10
```

## Resources

### Documentation

- **Phase 0 Testing Guide**: `docs/phase_0_testing_guide.md` ⭐ Start here!
- **API Design Doc**: `docs/api_design.md` - Complete API specification
- **Scoring Framework**: `docs/scoring_feedback_pipeline_proposal.md` - Quality metrics
- **Architecture**: `hybrid_arch.md` - System design
- **Main README**: `README.md` - Project overview

### Code

- **Prompt Templates**: `prompts/templates/` - System and user prompts
- **Demo App**: `demo/app.py` - Reference implementation
- **Evaluation Notebooks**: `notebooks/` - Quality assessment

## License

See LICENSE file in project root.
