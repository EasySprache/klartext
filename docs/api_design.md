# KlarText API Design Documentation

**Version:** 0.1.1  
**Last Updated:** January 10, 2026  
**Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [API Versioning Strategy](#api-versioning-strategy)
3. [Endpoint Reference](#endpoint-reference)
4. [Request/Response Models](#requestresponse-models)
5. [Batch Processing](#batch-processing)
6. [Browser Extension Integration](#browser-extension-integration)
7. [Feedback Loop & Analytics](#feedback-loop--analytics)
8. [TTS Provider Options](#tts-provider-options)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)
11. [Migration Guide](#migration-guide)

---

## Overview

The KlarText API is a RESTful service that transforms complex German and English text into easy-to-understand language. It's built with accessibility as a core principle, supporting users with reading difficulties, dyslexia, cognitive disabilities, and non-native speakers.

### Core Features

- **Text Simplification**: Three difficulty levels (very_easy, easy, medium)
- **PDF Extraction**: Extract text from uploaded PDF documents
- **URL Extraction**: Extract article content from web pages (stretch goal)
- **Text-to-Speech**: Convert simplified text to audio
- **Batch Processing**: Simplify multiple independent texts in one request
- **Performance Logging**: Collect telemetry for continuous improvement

### Technology Stack

#### **Framework: FastAPI 0.115.0**
**Why FastAPI?**
- **Automatic API documentation**: Generates interactive Swagger UI and ReDoc automatically from code
- **Built-in validation**: Type hints + Pydantic = automatic request/response validation with clear error messages
- **High performance**: One of the fastest Python frameworks (comparable to Node.js and Go), built on Starlette + Uvicorn
- **Async support**: Native async/await for handling concurrent LLM/TTS API calls efficiently
- **Modern Python**: Leverages Python 3.11+ features (type hints, async) which aligns with our codebase
- **Easy testing**: Built-in test client and excellent testing support
- **Industry adoption**: Used by Microsoft, Uber, Netflix for production APIs

#### **Documentation: OpenAPI 3.0 (Swagger UI)**
**Why OpenAPI/Swagger?**
- **Interactive testing**: Developers can test endpoints directly in the browser without writing code
- **Auto-generated**: Stays in sync with code automatically (no manual doc updates needed)
- **Client generation**: Frontend teams can generate TypeScript/JavaScript clients automatically
- **Industry standard**: Most widely-used API specification format
- **Accessibility**: Clear, visual documentation helps all team members understand the API
- **Schema validation**: Provides clear examples and validation rules for all requests/responses

#### **Validation: Pydantic 2.8.2** ([docs](https://pypi.org/project/pydantic/2.8.2/))
**Why Pydantic 2?**
- **Runtime validation**: Validates all incoming data at runtime with helpful error messages
- **Type safety**: Catches errors before they reach business logic
- **Performance**: Pydantic 2.x is significantly faster than v1 (5-50x speedup with Rust core)
- **Developer experience**: Clear error messages show exactly what's wrong with invalid data
- **JSON Schema generation**: Automatically creates OpenAPI schemas from Python type hints
- **Accessibility alignment**: Prevents malformed requests that could cause confusing errors for users
- **Data privacy**: Can validate/sanitize inputs to prevent injection attacks

#### **Server: Uvicorn with ASGI**
**Why Uvicorn?**
- **Async-first**: ASGI (Asynchronous Server Gateway Interface) enables true async request handling
- **High concurrency**: Can handle many LLM API calls simultaneously without blocking
- **Production-ready**: Battle-tested, used by major companies in production
- **WebSocket support**: Future-proofs the API if we need real-time features (streaming TTS, live simplification)
- **Easy deployment**: Works with Docker, Kubernetes, and all major cloud platforms
- **Low latency**: Minimal overhead between request receipt and handler execution

#### **Python: 3.11+**
**Why Python 3.11+?**
- **Performance**: Python 3.11 is 10-60% faster than 3.10 (CPython optimizations)
- **Better error messages**: Significantly improved traceback and error reporting (easier debugging)
- **Ecosystem alignment**: All LLM libraries (Groq, OpenAI, LangChain) are optimized for modern Python
- **Type hints**: Enhanced typing features make code more maintainable
- **Async improvements**: Better async/await performance and debugging
- **Security**: Latest security patches and vulnerability fixes
- **Team consistency**: Matches the evaluation notebooks and demo (already using 3.11)

---

## API Versioning Strategy

### Why We Use Versioning

The KlarText API uses **URL path versioning** (e.g., `/v1/simplify`) to ensure backwards compatibility as the API evolves. This approach allows us to:

1. **Make breaking changes safely** by creating new versions (`/v2/`) without disrupting existing clients
2. **Support multiple versions simultaneously** during migration periods
3. **Communicate expectations clearly** about API stability
4. **Follow industry best practices** (used by Stripe, Twilio, GitHub, OpenAI, etc.)

### What Constitutes a Breaking Change

**Breaking changes require a new version (e.g., `/v2/`):**

- ❌ Renaming a field in request or response
- ❌ Changing field data types
- ❌ Removing a field
- ❌ Making optional fields required
- ❌ Changing endpoint behavior in incompatible ways
- ❌ Changing authentication requirements

**Non-breaking changes can stay in the same version:**

- ✅ Adding new optional fields
- ✅ Adding new endpoints
- ✅ Adding new query parameters (if optional)
- ✅ Bug fixes that restore documented behavior
- ✅ Performance improvements
- ✅ Internal implementation changes

### Version Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│  Version Lifecycle                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  v1 Released        v2 Released       v1 Sunset        │
│  (2026-01)          (2026-07)         (2027-01)        │
│      │                  │                  │            │
│      ├──────────────────┼──────────────────┤            │
│      │   Both Active    │   v2 Only       │            │
│      │   (6 months)     │                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Typical timeline:**
- **New version released**: Both versions run in parallel
- **6-month migration period**: Encourage users to upgrade, provide migration guides
- **Deprecation warnings**: Add warnings to old version responses
- **Sunset date announced**: 3 months before shutdown
- **Old version removed**: After sufficient notice

### Current Version: v1

All endpoints are currently under `/v1/`:
- `/v1/simplify` - Core simplification
- `/v1/simplify/batch` - Batch processing
- `/v1/ingest/pdf` - PDF extraction
- `/v1/ingest/url` - URL extraction
- `/v1/tts` - Text-to-speech
- `/v1/log-run` - Performance logging

---

## Endpoint Reference

### Base URL

```
Development: http://localhost:8000
Production:  https://api.klartext.com (TBD)
```

### Health & Monitoring

#### `GET /healthz`

Basic health check for load balancers and monitoring systems.

**Response:**
```json
{
  "ok": true
}
```

---

### Simplification Endpoints

#### `POST /v1/simplify`

**Core endpoint**: Simplify a single text (short or long).

**Request:**
```json
{
  "text": "Der Antragsteller muss die erforderlichen Unterlagen einreichen.",
  "source_lang": "de",  // Optional, auto-detected if not provided
  "target_lang": "de",
  "level": "very_easy"  // Options: very_easy, easy, medium
}
```

**Response:**
```json
{
  "simplified_text": "Sie müssen Papiere abgeben.",
  "key_points": [
    "Dokumente sind nötig",
    "Sie müssen diese abgeben"
  ],
  "warnings": []
}
```

**Use cases:**
- Simplifying pasted text
- Processing entire documents (with automatic chunking)
- Single text transformation

---

#### `POST /v1/simplify/batch`

**Batch endpoint**: Simplify multiple independent texts in one request.

**Request:**
```json
{
  "texts": [
    "Der Antragsteller muss die Unterlagen einreichen.",
    "Die Frist beträgt 30 Tage.",
    "Bei Verspätung fallen Gebühren an."
  ],
  "target_lang": "de",
  "level": "easy"
}
```

**Response:**
```json
{
  "results": [
    {
      "index": 0,
      "simplified_text": "Sie müssen Dokumente abgeben.",
      "error": null,
      "warnings": []
    },
    {
      "index": 1,
      "simplified_text": "Sie haben 30 Tage Zeit.",
      "error": null,
      "warnings": []
    },
    {
      "index": 2,
      "simplified_text": "Wenn Sie zu spät sind, kostet das Geld.",
      "error": null,
      "warnings": []
    }
  ],
  "batch_id": "batch_abc12345",
  "successful_count": 3,
  "failed_count": 0
}
```

**Limits:**
- Maximum 10 texts per batch
- Each text max 5,000 characters
- Results returned in same order as input

**Use cases:**
- Browser extensions (simplify multiple selected paragraphs)
- Document sections (headers, body paragraphs, footers)
- Email clients (subject + multiple body paragraphs)
- List items (bullet points, instructions)

---

### Ingestion Endpoints

#### `POST /v1/ingest/pdf`

Extract text from uploaded PDF files.

**Request:**
```http
POST /v1/ingest/pdf
Content-Type: multipart/form-data

file: [PDF binary data]
```

**Response:**
```json
{
  "extracted_text": "Full text content from all pages...",
  "pages": 5,
  "warnings": ["page_3_appears_to_be_image_only"]
}
```

**Limitations:**
- Max file size: 10MB (configurable)
- Text-based PDFs work best
- Scanned/image PDFs may have limited extraction
- Password-protected PDFs not supported

---

#### `POST /v1/ingest/url`

Extract main article content from web pages (stretch goal).

**Request:**
```json
{
  "url": "https://example.com/news/article"
}
```

**Response:**
```json
{
  "extracted_text": "Main article content with ads/navigation removed...",
  "title": "Article Headline",
  "warnings": ["paywall_detected"]
}
```

**Note:** Uses trafilatura for intelligent content extraction.

---

### Text-to-Speech Endpoint

#### `POST /v1/tts` (stretch goal)

Convert text to speech audio.

**Request:**
```json
{
  "text": "Sie müssen diese Dokumente mitbringen.",
  "lang": "de"  // Options: de, en
}
```

**Response:**
```json
{
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2Z...",
  "audio_url": null,
  "format": "mp3"
}
```

**Provider Options:**

The TTS endpoint supports multiple providers (best option TBD based on quality/cost evaluation):

| Provider | Quality | Cost | Setup Complexity | Best For |
|----------|---------|------|------------------|----------|
| **OpenAI TTS API** | High | Paid | Medium (API key) | Production, high quality needs |
| **Google Cloud TTS** | High | Paid | High (GCP setup) | Enterprise deployments |
| **gTTS** | Medium | Free | Low | Development, testing, MVP |

**Configuration:**
- Provider is selected via environment variables
- See deployment documentation for setup instructions
- Default provider can be overridden per request (future enhancement)

---

### Analytics Endpoint

#### `POST /v1/log-run`

Log performance data for feedback loop and continuous improvement.

**Request:**
```json
{
  "run_id": "123e4567-e89b-12d3-a456-426614174000",
  "input_hash": "abc123def456789...",
  "input_length": 150,
  "target_lang": "de",
  "level": "easy",
  "model_used": "llama-3.1-8b-instant",
  "output_length": 120,
  "latency_ms": 250,
  "chunk_count": 1,
  "scores": {
    "lix": 37.3,
    "avg_sentence_len": 12.0,
    "pct_long_sentences": 5.0
  },
  "warnings": [],
  "user_feedback": "thumbs_up",  // Optional: thumbs_up, thumbs_down, flag
  "timestamp": "2026-01-10T14:30:00Z"
}
```

**Response:**
```json
{
  "logged": true,
  "run_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Privacy Guarantee:**
- ❌ **No raw user text is stored**
- ✅ Only SHA256 hash is logged (for deduplication)
- ✅ Metadata and scores only
- ✅ GDPR/privacy compliant

**Storage Options:**
- **MVP**: JSON Lines (JSONL) append-only file
- **Production**: PostgreSQL database with indexed queries
- **Analytics**: Export to data warehouse for trend analysis

---

## Request/Response Models

### Simplification Levels

| Level | Sentence Length | Style | Example |
|-------|----------------|-------|---------|
| `very_easy` | 8-10 words max | Defines all uncommon words in parentheses, bullet points, extra whitespace | "Sie müssen Papiere (Dokumente) abgeben. Das ist wichtig." |
| `easy` | 12-15 words | Clear structure with headings, minimal jargon, active voice | "Sie müssen wichtige Dokumente abgeben. Die Frist ist 30 Tage." |
| `medium` | Normal length | Plain language, avoids complex structures, technical terms only when necessary | "Sie müssen die erforderlichen Unterlagen innerhalb von 30 Tagen einreichen." |

### Quality Scores

When quality scoring is enabled, responses may include:

```json
{
  "scores": {
    "lix": 37.3,              // LIX readability score (target: < 40)
    "avg_sentence_len": 12.0, // Average words per sentence (target: < 15)
    "pct_long_sentences": 5.0, // % sentences > 20 words (target: < 10%)
    "avg_word_len": 4.8,      // Average characters per word
    "sentences": 5,           // Total sentence count
    "words": 60               // Total word count
  }
}
```

**Scoring Methodology:**
- Aligns with German "Leichte Sprache" guidelines
- Based on HIX (Hamburg Index) methodology
- See `docs/scoring_feedback_pipeline_proposal.md` for details

---

## Batch Processing

### When to Use Batch vs. Single Endpoint

**Decision Tree:**

```
Do you have multiple pieces of text?
│
├─ Yes: Are they independent snippets?
│   │
│   ├─ Yes: Use POST /v1/simplify/batch
│   │       Examples:
│   │       - Multiple paragraphs from different webpage sections
│   │       - List of bullet points
│   │       - Email subject + separate body paragraphs
│   │
│   └─ No: They're parts of one document
│           Use POST /v1/simplify
│           (internal chunking handles long texts)
│
└─ No: Single text
        Use POST /v1/simplify
```

### Batch Processing Benefits

1. **Reduced Network Overhead**: 1 HTTP request instead of N
2. **Lower Latency**: Single connection, parallel processing
3. **Better Rate Limiting**: Can count as 1 API call or proportional credits
4. **Atomic Operations**: Process related texts together
5. **Easier Error Handling**: Get all results in one response

### Partial Failures

The batch endpoint handles failures gracefully:

```json
{
  "results": [
    {
      "index": 0,
      "simplified_text": "Success result",
      "error": null
    },
    {
      "index": 1,
      "simplified_text": null,
      "error": "Text too short to simplify"
    },
    {
      "index": 2,
      "simplified_text": "Success result",
      "error": null
    }
  ],
  "successful_count": 2,
  "failed_count": 1
}
```

**Behavior:**
- Failed items return `error` message and `null` simplified_text
- Successful items proceed normally
- Entire batch doesn't fail if some items fail
- Results always in same order as input

---

## Browser Extension Integration

### Current MVP Approach

The KlarText browser extension uses the existing **`POST /v1/simplify/batch`** endpoint for its initial implementation. This allows rapid MVP testing without creating extension-specific infrastructure.

**Why start with batch endpoint:**
- ✅ Already implemented and documented
- ✅ Handles multiple text snippets efficiently
- ✅ No additional backend work needed
- ✅ Can test core functionality immediately
- ✅ Validates user experience before adding complexity

### Extension API Integration

```javascript
// In content/simplify.js or background/service-worker.js

const API_ENDPOINT = 'https://api.klartext.com/v1/simplify/batch';

async function simplifyViaApi(texts, targetLang = 'de', level = 'easy') {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add API key header when implementing auth
        // 'X-API-Key': chrome.storage.sync.get('apiKey')
      },
      body: JSON.stringify({
        texts: texts,
        target_lang: targetLang,
        level: level
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    // Returns: { results: [{index, simplified_text, error, warnings}], ... }
    return data.results;
  } catch (error) {
    console.error('Simplification failed:', error);
    // Fallback: use local mock transformer or show error to user
    return null;
  }
}

// Example: Simplify highlighted text
async function simplifySelection() {
  const selectedText = window.getSelection().toString();
  if (!selectedText) return;
  
  const results = await simplifyViaApi([selectedText]);
  if (results && results[0].simplified_text) {
    // Replace selected text on page
    replaceTextNode(results[0].simplified_text);
  }
}

// Example: Simplify multiple page sections
async function simplifyMultipleSections(textNodes) {
  const texts = textNodes.map(node => node.textContent);
  const results = await simplifyViaApi(texts);
  
  // Update each text node with simplified version
  results.forEach((result, i) => {
    if (result.simplified_text) {
      textNodes[i].textContent = result.simplified_text;
    } else if (result.error) {
      console.warn(`Failed to simplify text ${i}:`, result.error);
    }
  });
}
```

### Future Enhancement: Dedicated Extension Endpoint

**When to migrate:** Add `POST /v1/extension/simplify` when you need these features:

1. **HTML Context Metadata**
   ```json
   {
     "page_url": "https://example.com/article",
     "elements": [
       {
         "text": "Complex sentence here",
         "selector": "article > p:nth-child(3)",
         "tag_name": "p",
         "classes": ["lead-paragraph"],
         "semantic_role": "main-content"
       }
     ]
   }
   ```

2. **Page-Level Analytics**
   - Track which domains/sites are most frequently simplified
   - Identify problematic page structures
   - Domain-specific simplification rules (e.g., news sites vs. legal docs)

3. **Extension-Specific Rate Limits**
   - Different quotas for extension vs. web app users
   - Per-domain rate limiting (prevent abuse on specific sites)

4. **Semantic Preservation Hints**
   - Preserve links, emphasis, lists
   - Maintain heading hierarchy
   - Keep semantic HTML structure

5. **Caching Strategy**
   - Return cached results for frequently simplified pages
   - Reduce API calls for popular content

### Extension Endpoint Specification (Future)

```python
# Future implementation sketch

class ExtensionSimplifyRequest(BaseModel):
    """Request model for browser extension."""
    page_url: str = Field(description="URL of page being simplified")
    elements: List[ExtensionElement] = Field(description="HTML elements to simplify")
    preserve_html: bool = Field(default=False, description="Keep HTML tags in output")
    target_lang: str = Field(default="de", pattern="^(de|en)$")
    level: str = Field(default="easy", pattern="^(very_easy|easy|medium)$")
    user_id: Optional[str] = Field(default=None, description="Anonymous user ID for rate limiting")

class ExtensionElement(BaseModel):
    """Individual HTML element to simplify."""
    text: str
    selector: Optional[str] = None  # CSS selector
    tag_name: Optional[str] = None  # p, h1, li, etc.
    semantic_role: Optional[str] = None  # main-content, navigation, aside

class ExtensionSimplifyResponse(BaseModel):
    """Response with HTML context preserved."""
    results: List[ExtensionElementResult]
    cache_hit: bool = Field(description="Whether result was cached")
    rate_limit_remaining: int

class ExtensionElementResult(BaseModel):
    """Result for single element."""
    index: int
    simplified_text: str
    simplified_html: Optional[str] = None  # If preserve_html=True
    warnings: List[str] = []
    error: Optional[str] = None
```

### Migration Path

**Stage 1 (Current):** MVP with `/v1/simplify/batch`
- Extension highlights text → sends to batch endpoint
- Simple text replacement on page
- Basic error handling

**Stage 2:** Add analytics via `/v1/log-run`
- Log each simplification request
- Track user feedback (thumbs up/down)
- Monitor extension usage patterns

**Stage 3:** Build dedicated `/v1/extension/simplify`
- Add HTML metadata fields
- Implement domain-specific rules
- Enable page-level caching
- Add extension-specific rate limits

**Stage 4:** Advanced features
- Preserve semantic HTML
- Context-aware simplification (heading vs. body)
- Cross-element consistency (same term simplified same way)
- Streaming simplification for long pages

### Testing Strategy

1. **Local Testing:**
   ```bash
   # Terminal 1: Start API
   cd services/api
   uvicorn app.main:app --reload --port 8000
   
   # Terminal 2: Test with curl
   curl -X POST http://localhost:8000/v1/simplify/batch \
     -H "Content-Type: application/json" \
     -d '{"texts": ["Complex text here"], "target_lang": "en", "level": "easy"}'
   ```

2. **Extension Testing:**
   - Load extension in Chrome (`chrome://extensions` → Load unpacked)
   - Test on various websites (news, blogs, documentation)
   - Verify error handling (network failures, API errors)
   - Test with different text lengths and languages

3. **Production Deployment:**
   - Deploy API to Railway/Render
   - Update extension `API_ENDPOINT` to production URL
   - Add API key authentication
   - Monitor `/v1/log-run` for usage patterns

---

## Feedback Loop & Analytics

### Purpose

The `/v1/log-run` endpoint enables:
1. **Performance monitoring**: Track latency, success rates, errors
2. **Quality improvement**: Analyze which texts simplify well vs. poorly
3. **Model comparison**: A/B test different LLMs or prompt strategies
4. **User feedback integration**: Collect thumbs up/down for retraining
5. **Prompt engineering**: Data-driven optimization of simplification prompts

### Data Flow

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Frontend  │──────▶│  /v1/log-run│──────▶│  JSONL File │
│             │       │  Endpoint   │       │  or DB      │
└─────────────┘       └─────────────┘       └──────┬──────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │  Analytics    │
                                            │  Dashboard    │
                                            └───────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │  Prompt       │
                                            │  Optimization │
                                            └───────────────┘
```

### Implementation Phases

**Phase 1 (MVP):** JSONL file storage
```bash
# data/run_logs.jsonl
{"run_id": "...", "latency_ms": 250, ...}
{"run_id": "...", "latency_ms": 180, ...}
```

**Phase 2:** SQLite database with queries
```sql
SELECT AVG(latency_ms), model_used, level
FROM runs
WHERE timestamp > '2026-01-01'
GROUP BY model_used, level;
```

**Phase 3:** PostgreSQL + analytics dashboard
- Time-series charts of quality scores
- Model performance comparisons
- User feedback trends
- Error pattern analysis

---

## TTS Provider Options

### Provider Comparison

| Feature | OpenAI TTS | Google Cloud TTS | gTTS |
|---------|-----------|------------------|------|
| **Quality** | Excellent | Excellent | Good |
| **Cost** | $15/1M chars | $16/1M chars | Free |
| **Voices** | 6 voices | 380+ voices | 1 per language |
| **Languages** | 50+ | 220+ | 100+ |
| **Setup** | API key | GCP credentials | None |
| **Latency** | ~1-2s | ~1-2s | ~2-3s |
| **Rate Limits** | 50 RPM | Configurable | None |
| **Streaming** | Yes | Yes | No |
| **SSML Support** | No | Yes | No |

### Recommendation Strategy

**For MVP/Testing:**
- Start with **gTTS** (free, easy setup)
- Good enough quality for validation
- No cost or setup barriers

**For Production:**
- Evaluate **OpenAI TTS** (simple API, good quality)
- Consider **Google Cloud TTS** if you need:
  - Multiple voice options
  - SSML for pronunciation control
  - Higher rate limits

**Configuration:**
```bash
# .env
TTS_PROVIDER=openai  # Options: openai, google, gtts
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Future Enhancements

1. **Voice selection**: Allow users to choose voice style
2. **Speed control**: Adjust speaking rate
3. **SSML support**: Fine-tune pronunciation
4. **Caching**: Store generated audio for repeated texts
5. **Streaming**: Return audio chunks as they're generated

---

## Error Handling

### Standard Error Response

All errors follow this structure:

```json
{
  "detail": "Error message for developers",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly error message",
    "details": {
      "field": "text",
      "issue": "Text exceeds maximum length of 40,000 characters"
    }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | Request processed successfully |
| `400` | Bad Request | Invalid input, validation failed |
| `401` | Unauthorized | Missing or invalid API key |
| `413` | Payload Too Large | File upload exceeds size limit |
| `422` | Unprocessable Entity | Valid JSON but invalid data |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | External service (LLM, TTS) unavailable |

### Common Error Codes

```
VALIDATION_ERROR         - Input validation failed
TEXT_TOO_LONG           - Input exceeds maximum length
TEXT_TOO_SHORT          - Input below minimum length
UNSUPPORTED_LANGUAGE    - Language not supported
UNSUPPORTED_LEVEL       - Invalid simplification level
PDF_EXTRACTION_FAILED   - Could not extract text from PDF
URL_FETCH_FAILED        - Could not fetch URL content
LLM_SERVICE_UNAVAILABLE - LLM provider unavailable
TTS_SERVICE_UNAVAILABLE - TTS provider unavailable
RATE_LIMIT_EXCEEDED     - Too many requests
```

---

## Rate Limiting

### MVP Strategy (In-Memory)

For initial development, use simple in-memory rate limiting:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/v1/simplify")
@limiter.limit("30/minute")  # 30 requests per minute per IP
def simplify(req: SimplifyRequest):
    ...
```

**Limits (MVP):**
- 30 requests/minute per IP
- 10 batch requests/minute per IP
- 5 PDF uploads/minute per IP

### Production Strategy (Redis)

For production, use Redis-backed rate limiting:

```python
from slowapi.middleware import SlowAPIMiddleware
from redis import Redis

redis_client = Redis(host='localhost', port=6379, db=0)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)

# Tiered rate limits based on API key tier
@app.post("/v1/simplify")
@limiter.limit("100/minute", key_func=get_api_key)  # Pro tier
@limiter.limit("30/minute", key_func=get_remote_address)  # Free tier
def simplify(req: SimplifyRequest):
    ...
```

**Future Enhancements:**
- API key-based rate limiting (replace IP-based)
- Tiered plans (free, pro, enterprise)
- Quota tracking (monthly request limits)
- Rate limit headers in responses

---

## Migration Guide

### From Gradio Demo to API

**Before (Gradio):**
```python
import gradio as gr

def simplify_text(text, lang):
    # Direct function call
    return simplified_text

demo = gr.Interface(fn=simplify_text, ...)
demo.launch()
```

**After (API):**
```python
import requests

response = requests.post(
    "http://localhost:8000/v1/simplify",
    json={
        "text": text,
        "target_lang": lang,
        "level": "easy"
    }
)
result = response.json()
simplified = result["simplified_text"]
```

### Key Differences

| Aspect | Gradio Demo | FastAPI |
|--------|-------------|---------|
| **Interface** | Web UI only | REST API (any client) |
| **Structure** | Function calls | HTTP requests |
| **Validation** | None | Pydantic models |
| **Documentation** | None | Auto-generated Swagger |
| **Versioning** | None | URL path versioning |
| **Rate Limiting** | None | Built-in support |
| **Authentication** | None | API key support |
| **Monitoring** | None | Logging endpoint |

---

## Related Documentation

- **Implementation Status**: `IMPLEMENTATION_SUMMARY.md` - Project phases and current status
- **API Setup Guide**: `services/api/README.md` - Installation and configuration
- **Testing Guide**: `docs/phase_0_testing_guide.md` - Testing procedures
- **Scoring Framework**: `docs/scoring_feedback_pipeline_proposal.md` - Quality metrics
- **Architecture**: `hybrid_arch.md` - Overall system design
- **Project README**: `README.md` - Project overview

### Live API Documentation

- **Swagger UI**: http://localhost:8000/docs (interactive API documentation)
- **ReDoc**: http://localhost:8000/redoc (alternative API documentation)
- **OpenAPI Spec**: http://localhost:8000/openapi.json (machine-readable specification)

---

## Changelog

### Version 0.2.0 (2026-01-12)
- **Reorganized documentation structure**
  - Moved implementation phases and status to `IMPLEMENTATION_SUMMARY.md`
  - Focused this document on pure API design and specifications
  - Added clear references to related documentation
  - Removed redundant implementation checklists

### Version 0.1.1 (2026-01-10)
- **Added Browser Extension Integration section**
  - Documented MVP approach using `/v1/simplify/batch` endpoint
  - Provided extension API integration code examples
  - Defined future enhancement plan for dedicated `/v1/extension/simplify` endpoint
  - Added migration path from batch to dedicated extension endpoint
  - Included testing strategy for extension development

### Version 0.1.0 (2026-01-10)
- Initial API design documentation
- Defined `/v1/` endpoints structure
- Added batch processing endpoint
- Added feedback loop endpoint (`/v1/log-run`)
- Documented TTS provider options
- Established versioning strategy
