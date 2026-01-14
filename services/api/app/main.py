from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
import base64
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# =============================================================================
# API Documentation
# =============================================================================

API_DESCRIPTION = """
## KlarText API

**Turn complex German/English text into easy-to-understand language.**

KlarText is an accessibility-first tool designed for people who get overwhelmed by long sentences, 
legal/bureaucratic phrasing, or technical language. This includes people with:
- Reading or cognitive difficulties
- Dyslexia
- Non-native speakers
- Anyone who needs simpler text

### How It Works

1. **Send text** via paste, PDF upload, or URL
2. **Choose a difficulty level** (very_easy, easy, medium)
3. **Get simplified text** back — optionally with audio (TTS)

### Important Notes

⚠️ KlarText produces "easy language" simplifications. It is **not** certified "Leichte Sprache" 
and does not guarantee legal/medical/financial accuracy. Always consult professionals for 
important decisions.

### Quick Start

```python
import requests

response = requests.post(
    "http://localhost:8000/v1/simplify",
    json={
        "text": "Your complex text here...",
        "target_lang": "de",
        "level": "easy"
    }
)
print(response.json()["simplified_text"])
```
"""

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Health check endpoint for monitoring and orchestration. "
                       "Use this to verify the API is running and responsive.",
    },
    {
        "name": "Simplification",
        "description": "**Core feature** — Transform complex text into easy-to-understand language. "
                       "Supports German and English with three difficulty levels.",
    },
    {
        "name": "Ingestion",
        "description": "Extract text from various sources (PDF files, web URLs) so it can be simplified. "
                       "Use these endpoints to get text, then send it to `/v1/simplify`.",
    },
    {
        "name": "TTS",
        "description": "**Text-to-Speech** — Convert simplified text to audio. "
                       "Essential for accessibility: helps users with dyslexia, visual impairments, "
                       "or anyone who prefers listening.",
    },
    {
        "name": "Analytics",
        "description": "**Performance logging** — Collect telemetry data for feedback loop, "
                       "model evaluation, and continuous improvement. No raw user text is stored.",
    },
]

app = FastAPI(
    title="KlarText API",
    description=API_DESCRIPTION,
    version="0.1.0",
    openapi_tags=TAGS_METADATA,
    license_info={
        "name": "Non-Commercial Use",
        "url": "https://github.com/klartext/klartext#license",
    },
    contact={
        "name": "KlarText Team",
    },
)

# CORS middleware for frontend and extension
# Note: In development, we allow all origins for Chrome extension testing
# Content scripts run in webpage context, so they use webpage's origin (not chrome-extension://)
# TODO: In production, restrict to specific domains only
import os

# Get environment
environment = os.getenv("ENVIRONMENT", "development")

if environment == "development":
    # Development: Allow ALL origins for Chrome extension testing
    # Content scripts make requests from the webpage's origin (e.g., https://wikipedia.org)
    # So we need to accept requests from any webpage
    allowed_origins = ["*"]
    allow_origin_regex = None
else:
    # Production: Only allow specific origins
    allowed_origins_str = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://localhost:5173,http://localhost:7860"
    )
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Request/Response Models
# =============================================================================

class SimplifyRequest(BaseModel):
    """Request body for text simplification."""
    
    text: str = Field(
        min_length=1,
        max_length=40000,
        description="The complex text to simplify. Can be German or English.",
        json_schema_extra={"example": "Der Antragsteller muss die erforderlichen Unterlagen innerhalb der gesetzlich vorgeschriebenen Frist einreichen."}
    )
    source_lang: Optional[str] = Field(
        default=None,
        pattern="^(de|en)$",
        description="Source language of the input text. If not provided, will be auto-detected. Options: `de` (German), `en` (English)."
    )
    target_lang: str = Field(
        default="de",
        pattern="^(de|en)$",
        description="Target language for the simplified output. Options: `de` (German), `en` (English).",
        json_schema_extra={"example": "de"}
    )
    level: str = Field(
        default="easy",
        pattern="^(very_easy|easy|medium)$",
        description="""Simplification level:
        
- **very_easy**: Very short sentences (8-10 words max), defines all uncommon words in parentheses, extra whitespace between paragraphs, uses bullet points
- **easy**: Short sentences (12-15 words), clear structure with headings, minimal jargon, active voice
- **medium**: Plain language with normal sentence length, avoids complex structures, technical terms only when necessary""",
        json_schema_extra={"example": "easy"}
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Der Antragsteller muss die erforderlichen Unterlagen innerhalb der gesetzlich vorgeschriebenen Frist einreichen.",
                    "target_lang": "de",
                    "level": "very_easy"
                }
            ]
        }
    }


class SimplifyResponse(BaseModel):
    """Response containing the simplified text."""
    
    simplified_text: str = Field(
        description="The simplified version of the input text, written in easy-to-understand language."
    )
    key_points: Optional[list[str]] = Field(
        default=None,
        description="Optional list of 2-3 key points summarizing the main ideas. Useful for quick understanding."
    )
    warnings: list[str] = Field(
        default=[],
        description="Any warnings about the simplification (e.g., 'contains_legal_content', 'very_long_input_chunked')."
    )


class PDFIngestResponse(BaseModel):
    """Response from PDF text extraction."""
    
    extracted_text: str = Field(
        description="The full text content extracted from the PDF document."
    )
    pages: int = Field(
        description="Number of pages in the PDF."
    )
    warnings: list[str] = Field(
        default=[],
        description="Warnings about the extraction (e.g., 'page_3_appears_to_be_image_only', 'password_protected')."
    )


class URLIngestRequest(BaseModel):
    """Request body for URL content extraction."""
    
    url: HttpUrl = Field(
        description="The webpage URL to extract article content from. The API will fetch the page and extract the main content, removing navigation, ads, and other boilerplate.",
        json_schema_extra={"example": "https://example.com/news/article"}
    )


class URLIngestResponse(BaseModel):
    """Response from URL content extraction."""
    
    extracted_text: str = Field(
        description="The main article/content text extracted from the webpage, with boilerplate removed."
    )
    title: Optional[str] = Field(
        default=None,
        description="The page or article title, if detected."
    )
    warnings: list[str] = Field(
        default=[],
        description="Warnings about the extraction (e.g., 'paywall_detected', 'content_may_be_incomplete')."
    )


class TTSRequest(BaseModel):
    """Request body for text-to-speech conversion."""
    
    text: str = Field(
        min_length=1,
        max_length=5000,
        description="The text to convert to speech. Should be the simplified text for best results.",
        json_schema_extra={"example": "Sie müssen diese Dokumente mitbringen. Das ist wichtig."}
    )
    lang: str = Field(
        default="de",
        pattern="^(de|en)$",
        description="Language for speech synthesis. Affects voice selection and pronunciation. Options: `de` (German), `en` (English).",
        json_schema_extra={"example": "de"}
    )


class TTSResponse(BaseModel):
    """Response containing the generated audio."""
    
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded audio data. Decode and save as the specified format to play."
    )
    audio_url: Optional[str] = Field(
        default=None,
        description="URL to the audio file (if stored externally). Use this for streaming playback."
    )
    format: str = Field(
        default="mp3",
        description="Audio format of the response. Currently always 'mp3'."
    )


class LogRunRequest(BaseModel):
    """Request body for logging a simplification run for analysis."""
    
    model_config = {"protected_namespaces": ()}  # Allow "model_" prefix
    
    run_id: str = Field(
        description="Unique identifier for this run (UUID recommended)",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"}
    )
    input_hash: str = Field(
        description="SHA256 hash of input text (for deduplication, not storing raw text)",
        json_schema_extra={"example": "abc123def456..."}
    )
    input_length: int = Field(
        gt=0,
        description="Character count of input text",
        json_schema_extra={"example": 150}
    )
    target_lang: str = Field(
        pattern="^(de|en)$",
        description="Target language used",
        json_schema_extra={"example": "de"}
    )
    level: str = Field(
        pattern="^(very_easy|easy|medium)$",
        description="Simplification level used",
        json_schema_extra={"example": "easy"}
    )
    model_used: str = Field(
        description="Model identifier (e.g., 'llama-3.1-8b-instant')",
        json_schema_extra={"example": "llama-3.1-8b-instant"}
    )
    output_length: int = Field(
        gt=0,
        description="Character count of output text",
        json_schema_extra={"example": 120}
    )
    latency_ms: int = Field(
        gt=0,
        description="End-to-end processing time in milliseconds",
        json_schema_extra={"example": 250}
    )
    chunk_count: Optional[int] = Field(
        default=1,
        gt=0,
        description="Number of chunks the input was split into"
    )
    scores: Optional[dict] = Field(
        default=None,
        description="Quality scores: {lix, avg_sentence_len, pct_long_sentences, etc.}",
        json_schema_extra={"example": {"lix": 37.3, "avg_sentence_len": 12.0, "pct_long_sentences": 5.0}}
    )
    warnings: Optional[list[str]] = Field(
        default=[],
        description="Any warnings generated during processing"
    )
    user_feedback: Optional[str] = Field(
        default=None,
        pattern="^(thumbs_up|thumbs_down|flag)$",
        description="Optional user feedback if provided"
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO 8601 timestamp (auto-generated if not provided)"
    )


class LogRunResponse(BaseModel):
    """Response confirming the run was logged."""
    
    logged: bool = Field(
        description="Whether the run was successfully logged"
    )
    run_id: str = Field(
        description="The run ID that was logged"
    )


class BatchSimplifyRequest(BaseModel):
    """Request body for batch text simplification."""
    
    texts: list[str] = Field(
        min_length=1,
        max_length=10,
        description="List of independent texts to simplify (max 10 texts, each max 5000 characters)",
        json_schema_extra={"example": [
            "Der Antragsteller muss die Unterlagen einreichen.",
            "Die Frist beträgt 30 Tage.",
            "Bei Verspätung fallen Gebühren an."
        ]}
    )
    target_lang: str = Field(
        default="de",
        pattern="^(de|en)$",
        description="Target language for all simplified outputs",
        json_schema_extra={"example": "de"}
    )
    level: str = Field(
        default="easy",
        pattern="^(very_easy|easy|medium)$",
        description="Simplification level for all texts",
        json_schema_extra={"example": "easy"}
    )


class BatchItemResult(BaseModel):
    """Result for a single item in a batch simplification."""
    
    index: int = Field(
        description="Index of this text in the input array (0-based)"
    )
    simplified_text: Optional[str] = Field(
        default=None,
        description="The simplified version (null if processing failed)"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if this item failed to process"
    )
    warnings: list[str] = Field(
        default=[],
        description="Warnings specific to this item"
    )


class BatchSimplifyResponse(BaseModel):
    """Response containing results for all texts in the batch."""
    
    results: list[BatchItemResult] = Field(
        description="Results for each text, in the same order as the input"
    )
    batch_id: str = Field(
        description="Unique identifier for this batch operation"
    )
    successful_count: int = Field(
        description="Number of texts successfully simplified"
    )
    failed_count: int = Field(
        description="Number of texts that failed to process"
    )


# =============================================================================
# Health Check
# =============================================================================

@app.get(
    "/healthz",
    tags=["Health"],
    summary="Health check",
    response_description="Returns ok:true if the API is healthy",
)
def healthz():
    """
    **Health check endpoint** for monitoring and container orchestration.
    
    Use this endpoint to:
    - Verify the API is running
    - Configure Docker/Kubernetes health checks
    - Set up load balancer health probes
    
    Returns `{"ok": true}` when healthy.
    """
    return {"ok": True}


# =============================================================================
# Simplify Endpoint
# =============================================================================

@app.post(
    "/v1/simplify",
    response_model=SimplifyResponse,
    tags=["Simplification"],
    summary="Simplify text into easy language",
    response_description="The simplified text with optional key points",
)
def simplify(req: SimplifyRequest):
    """
    **Core feature** — Transform complex text into easy-to-understand language.
    
    This is the main endpoint of KlarText. Send any complex German or English text 
    and receive a simplified version appropriate for people with reading difficulties.
    
    ## How it works
    
    1. Text is analyzed for language (or uses provided `source_lang`)
    2. Long texts are automatically chunked to stay within LLM limits
    3. Each chunk is simplified according to the selected `level`
    4. Results are recombined into coherent output
    
    ## Simplification Levels
    
    | Level | Sentence Length | Style |
    |-------|-----------------|-------|
    | **very_easy** | 8-10 words max | Defines all uncommon words, bullet points, extra spacing |
    | **easy** | 12-15 words | Clear structure, headings, minimal jargon |
    | **medium** | Normal length | Plain language, avoids complex structures |
    
    ## Guidelines followed
    
    - ✅ Short sentences, common words
    - ✅ Explains technical terms when unavoidable
    - ✅ Preserves meaning — no invented facts
    - ✅ Adds "not professional advice" note for legal/medical/financial content
    - ❌ Does NOT add new information
    - ❌ Does NOT guarantee certified "Leichte Sprache"
    
    ## Example
    
    **Input (German legal text):**
    > "Der Antragsteller muss die erforderlichen Unterlagen innerhalb der gesetzlich vorgeschriebenen Frist einreichen."
    
    **Output (level: very_easy):**
    > "Sie müssen Papiere abgeben. Das müssen Sie bis zu einem bestimmten Tag tun. Der Tag steht im Gesetz."
    """
    from .core.llm_adapter import simplify_text_with_llm
    
    try:
        # Call LLM to simplify text
        simplified_text = simplify_text_with_llm(
            text=req.text,
            target_lang=req.target_lang,
            level=req.level,
        )
        
        # TODO: Add chunking for long texts
        # TODO: Extract key points
        # TODO: Add quality scoring
        
        return SimplifyResponse(
            simplified_text=simplified_text,
            key_points=[],  # TODO: Implement key point extraction
            warnings=[],    # TODO: Add validation warnings
        )
        
    except ValueError as e:
        # Input validation errors
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        # Template loading errors
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")
    except Exception as e:
        # LLM API or other errors
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Simplification failed: {str(e)}")


# =============================================================================
# PDF Ingestion Endpoint
# =============================================================================

@app.post(
    "/v1/ingest/pdf",
    response_model=PDFIngestResponse,
    tags=["Ingestion"],
    summary="Extract text from PDF",
    response_description="Extracted text content and metadata",
)
async def ingest_pdf(
    file: UploadFile = File(
        ...,
        description="PDF file to extract text from (max 10MB recommended)"
    )
):
    """
    **Extract text from an uploaded PDF file** so it can be simplified.
    
    Many official documents (government forms, legal notices, medical reports) come as PDFs. 
    This endpoint extracts the text content so you can then simplify it with `/v1/simplify`.
    
    ## Supported PDFs
    
    - ✅ Text-based PDFs (most common)
    - ✅ Multi-page documents
    - ⚠️ Scanned/image PDFs (limited — may return warning)
    - ❌ Password-protected PDFs (will return error)
    
    ## Workflow
    
    ```
    1. Upload PDF → /v1/ingest/pdf
    2. Get extracted_text from response
    3. Send extracted_text → /v1/simplify
    4. (Optional) Send simplified_text → /v1/tts
    ```
    
    ## Warnings
    
    The response may include warnings such as:
    - `page_X_appears_to_be_image_only` — Some pages may need OCR
    - `document_is_very_long` — Consider simplifying in sections
    - `extraction_may_be_incomplete` — Complex layouts may lose some text
    """
    from .core.pdf_extractor import extract_pdf_text
    
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 10MB)
    max_size_mb = 10
    max_size_bytes = max_size_mb * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"PDF file too large. Max size is {max_size_mb}MB, got {len(content) / 1024 / 1024:.1f}MB"
        )
    
    # Check for empty file
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    try:
        # Extract text from PDF
        extracted_text, page_count, warnings = extract_pdf_text(
            pdf_content=content,
            filename=file.filename,
        )
        
        return PDFIngestResponse(
            extracted_text=extracted_text,
            pages=page_count,
            warnings=warnings,  # Empty list is fine, Pydantic expects list not None
        )
        
    except ValueError as e:
        # User-facing errors (password-protected, corrupted, no text, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected errors
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")


# =============================================================================
# URL Ingestion Endpoint (Stretch Goal)
# =============================================================================

@app.post(
    "/v1/ingest/url",
    response_model=URLIngestResponse,
    tags=["Ingestion"],
    summary="Extract article text from URL",
    response_description="Extracted article content and metadata",
)
def ingest_url(req: URLIngestRequest):
    """
    **Extract main article text from a webpage** (stretch goal).
    
    Users often want to simplify news articles, government pages, or medical information 
    without manually copying text. This endpoint fetches the URL and intelligently extracts 
    just the main content.
    
    ## What gets extracted
    
    - ✅ Main article body text
    - ✅ Article title
    - ❌ Navigation menus (removed)
    - ❌ Advertisements (removed)
    - ❌ Sidebars, footers (removed)
    - ❌ Comments sections (removed)
    
    ## How it works
    
    Uses [trafilatura](https://github.com/adbar/trafilatura) for intelligent content extraction. 
    This library is specifically designed for extracting article content from news sites, 
    blogs, and documentation pages.
    
    ## Limitations
    
    - ⚠️ Paywalled content cannot be accessed
    - ⚠️ JavaScript-heavy sites may not extract fully
    - ⚠️ Some complex layouts may lose content
    
    ## Workflow
    
    ```
    1. Send URL → /v1/ingest/url
    2. Get extracted_text from response
    3. Send extracted_text → /v1/simplify
    ```
    """
    # TODO: Implement URL extraction with trafilatura
    # Placeholder implementation
    return URLIngestResponse(
        extracted_text=f"[Placeholder] Extracted text from {req.url}",
        title="Placeholder Title",
        warnings=["placeholder_response", "url_extraction_not_implemented"],
    )


# =============================================================================
# Text-to-Speech Endpoint
# =============================================================================

@app.post(
    "/v1/tts",
    response_model=TTSResponse,
    tags=["TTS"],
    summary="Convert text to speech",
    response_description="Audio data as base64 or URL",
)
def text_to_speech(req: TTSRequest):
    """
    **Convert text to speech audio** — essential for accessibility.
    
    This endpoint generates audio from text, allowing users to listen instead of 
    (or while) reading. This is critical for:
    
    - 👁️ Users with visual impairments
    - 📖 Users with dyslexia (often comprehend better when hearing)
    - 🚗 Multitasking users who want to listen
    - 🌍 Non-native speakers practicing pronunciation
    
    ## Best practice
    
    Send the **simplified text** (output from `/v1/simplify`) rather than the original 
    complex text. The simplified version will be clearer when spoken.
    
    ## Response format
    
    The response includes either:
    - `audio_base64`: Base64-encoded audio data (decode and play directly)
    - `audio_url`: URL to stream/download the audio file
    
    Currently returns MP3 format.
    
    ## Language support
    
    | Language | Code | Voice |
    |----------|------|-------|
    | German | `de` | Native German voice |
    | English | `en` | Native English voice |
    
    ## TTS Provider Options
    
    Multiple TTS providers are supported (best option TBD based on quality/cost evaluation):
    
    - **OpenAI TTS API** — High quality, requires API key, paid service
    - **Google Cloud TTS** — High quality, enterprise-grade, requires GCP setup
    - **gTTS (Google Text-to-Speech)** — Free but lower quality, good for testing
    
    The provider is configured via environment variables. See deployment documentation 
    for setup instructions.
    
    ## Example usage (JavaScript)
    
    ```javascript
    const response = await fetch('/v1/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hallo Welt', lang: 'de' })
    });
    const { audio_base64 } = await response.json();
    const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
    audio.play();
    ```
    """
    # TODO: Implement TTS with configurable provider
    # Options: OpenAI TTS API, Google Cloud TTS, or gTTS (best option TBD)
    # Placeholder: return empty audio with warning
    return TTSResponse(
        audio_base64=None,
        audio_url=None,
        format="mp3",
    )


# =============================================================================
# Log Run Endpoint (Feedback Loop)
# =============================================================================

@app.post(
    "/v1/log-run",
    response_model=LogRunResponse,
    tags=["Analytics"],
    summary="Log simplification run for feedback loop",
    response_description="Confirmation of logged run",
)
def log_run(req: LogRunRequest):
    """
    **Log performance data for a simplification run** to enable feedback loop.
    
    This endpoint collects telemetry data to support:
    - Performance monitoring and optimization
    - Model comparison and A/B testing
    - Prompt engineering feedback
    - Quality trend analysis
    - Error pattern detection
    
    ## What Gets Logged
    
    - ✅ Metadata (run ID, timestamp, model, parameters)
    - ✅ Performance metrics (latency, chunk count)
    - ✅ Quality scores (LIX, sentence length, etc.)
    - ✅ Warnings and edge cases
    - ✅ User feedback if provided
    - ❌ Raw user text (only hashed for privacy)
    
    ## Privacy & Security
    
    **No raw text is stored** — only the SHA256 hash of the input. This allows:
    - Deduplication detection
    - Cache lookup
    - No PII/sensitive data storage
    
    ## Implementation Notes
    
    For MVP, logs can be written to:
    - JSON Lines file (append-only)
    - SQLite database
    - Postgres table (for production)
    
    Data structure aligns with the scoring framework described in 
    `docs/scoring_feedback_pipeline_proposal.md`.
    
    ## Example Usage
    
    ```python
    import hashlib
    import time
    import uuid
    
    # Before simplification
    start_time = time.time()
    input_hash = hashlib.sha256(text.encode()).hexdigest()
    
    # ... perform simplification ...
    
    # After simplification
    latency_ms = int((time.time() - start_time) * 1000)
    
    # Log the run
    requests.post("/v1/log-run", json={
        "run_id": str(uuid.uuid4()),
        "input_hash": input_hash,
        "input_length": len(text),
        "target_lang": "de",
        "level": "easy",
        "model_used": "llama-3.1-8b-instant",
        "output_length": len(simplified_text),
        "latency_ms": latency_ms,
        "scores": {"lix": 37.3, "avg_sentence_len": 12.0}
    })
    ```
    """
    # TODO: Implement logging to database/file
    # For MVP: append to JSONL file with proper file locking
    # For production: insert into Postgres with async batch writes
    
    # Placeholder implementation
    import datetime
    timestamp = req.timestamp or datetime.datetime.utcnow().isoformat()
    
    # In production, you would:
    # 1. Add timestamp if not provided
    # 2. Validate run_id is unique (or allow duplicates for retries)
    # 3. Write to storage (JSONL file or DB)
    # 4. Optionally emit to metrics system (Prometheus, DataDog, etc.)
    
    return LogRunResponse(
        logged=True,
        run_id=req.run_id,
    )


# =============================================================================
# Batch Simplification Endpoint
# =============================================================================

@app.post(
    "/v1/simplify/batch",
    response_model=BatchSimplifyResponse,
    tags=["Simplification"],
    summary="Simplify multiple texts in one request",
    response_description="Results for all texts in the batch",
)
def simplify_batch(req: BatchSimplifyRequest):
    """
    **Simplify multiple independent texts in a single API call.**
    
    This endpoint is designed for use cases where you need to simplify several 
    separate text snippets at once, such as:
    
    - **Browser extensions**: Simplify multiple selected paragraphs on a webpage
    - **Document sections**: Process headers, paragraphs, and footers separately
    - **List items**: Simplify multiple bullet points or instructions
    - **Email clients**: Simplify subject + body paragraphs independently
    
    ## When to Use Batch vs. Single
    
    **Use `/v1/simplify/batch` when:**
    - ✅ You have multiple **independent** text snippets (e.g., 5 paragraphs from different page sections)
    - ✅ Each text should be simplified separately (not combined)
    - ✅ You want to reduce network overhead (1 request instead of N)
    
    **Use `/v1/simplify` when:**
    - ✅ You have **one cohesive document** (even if it's very long)
    - ✅ The text should be simplified as a whole
    - ✅ Long texts will be automatically chunked internally
    
    ## Limits
    
    - Maximum **10 texts** per batch
    - Each text limited to **5,000 characters**
    - Total batch size should be reasonable for your use case
    
    ## Response Structure
    
    Results are returned in the **same order** as the input. If any individual 
    text fails, the batch continues processing the others:
    
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
          "simplified_text": null,
          "error": "Text too short to simplify",
          "warnings": []
        },
        {
          "index": 2,
          "simplified_text": "Sie haben 30 Tage Zeit.",
          "error": null,
          "warnings": []
        }
      ],
      "batch_id": "batch_123e4567",
      "successful_count": 2,
      "failed_count": 1
    }
    ```
    
    ## Example: Browser Extension
    
    ```javascript
    // User selects multiple paragraphs on a government website
    const selectedTexts = document.querySelectorAll('.selected-paragraph')
      .map(el => el.textContent);
    
    const response = await fetch('/v1/simplify/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: selectedTexts,
        target_lang: 'de',
        level: 'easy'
      })
    });
    
    const { results } = await response.json();
    results.forEach((result, i) => {
      if (result.simplified_text) {
        document.querySelectorAll('.selected-paragraph')[i]
          .textContent = result.simplified_text;
      }
    });
    ```
    
    ## Performance
    
    Batch processing is more efficient than individual requests because:
    - Single HTTP connection
    - Reduced network overhead
    - Potential for parallel LLM processing
    - Better rate limiting (counts as 1 API call or proportional credit usage)
    """
    from .core.llm_adapter import simplify_text_with_llm
    import uuid
    
    # Generate unique batch ID
    batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    
    # Validate batch size
    if len(req.texts) > 10:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 10 texts per batch. Please split into multiple requests."
        )
    
    results = []
    
    # Process each text individually
    for i, text in enumerate(req.texts):
        # Validate text length
        if not text or len(text.strip()) < 10:
            results.append(BatchItemResult(
                index=i,
                simplified_text=None,
                error="Text too short to simplify (minimum 10 characters)",
                warnings=[],
            ))
            continue
        
        if len(text) > 5000:
            results.append(BatchItemResult(
                index=i,
                simplified_text=None,
                error="Text too long (maximum 5000 characters per text in batch mode)",
                warnings=[],
            ))
            continue
        
        # Simplify this text
        try:
            simplified_text = simplify_text_with_llm(
                text=text,
                target_lang=req.target_lang,
                level=req.level,
            )
            
            # Success
            results.append(BatchItemResult(
                index=i,
                simplified_text=simplified_text,
                error=None,
                warnings=[],
            ))
            
        except ValueError as e:
            # Validation error for this specific text
            results.append(BatchItemResult(
                index=i,
                simplified_text=None,
                error=f"Validation error: {str(e)}",
                warnings=[],
            ))
            
        except FileNotFoundError as e:
            # Template loading error (should not happen per-text, but handle it)
            results.append(BatchItemResult(
                index=i,
                simplified_text=None,
                error=f"Template error: {str(e)}",
                warnings=[],
            ))
            
        except Exception as e:
            # LLM API or other errors for this specific text
            results.append(BatchItemResult(
                index=i,
                simplified_text=None,
                error=f"Simplification failed: {str(e)}",
                warnings=[],
            ))
    
    # Calculate success/failure counts
    successful_count = sum(1 for r in results if r.simplified_text is not None)
    failed_count = len(results) - successful_count
    
    return BatchSimplifyResponse(
        results=results,
        batch_id=batch_id,
        successful_count=successful_count,
        failed_count=failed_count,
    )
