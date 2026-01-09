# PDF Upload & Extraction Proposal

**Status:** Draft Proposal  
**Date:** January 8, 2026  
**Author:** KlarText Team

---

## Executive Summary

This document outlines a proposal for adding PDF upload and text extraction capabilities to the KlarText Gradio demo. The goal is to enable users to upload PDF documents and have the text automatically extracted, cleaned, and displayed for review before simplification.

**Key Benefits:**
- Streamlined workflow for document simplification
- Automatic text cleanup (de-hyphenation, header/footer removal, whitespace normalization)
- User preview and editing before simplification
- Support for common document types (legal, medical, government forms)

---

## 1. Current State

### 1.1 What Exists Today

| Component | Location | Status | Description |
|-----------|----------|--------|-------------|
| **Gradio Demo** | `demo/app.py` | ✅ Working | Interactive UI for text simplification |
| **Text Input** | `demo/app.py` | ✅ Working | Manual paste or sample text loading |
| **Sample Texts** | `data/samples/` | ✅ Available | Pre-loaded text samples for testing |

### 1.2 Current User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User manually copies text from PDF                      │
│                         ↓                                   │
│  2. User pastes into input textbox                          │
│                         ↓                                   │
│  3. User clicks "Simplify" → output appears                 │
└─────────────────────────────────────────────────────────────┘
```

**Pain Points:**
- Manual copy-paste loses formatting and introduces errors
- Copy from PDF often includes hyphenated line breaks
- Headers/footers get mixed into content
- Extra whitespace and line breaks clutter the text

---

## 2. Proposed Solution

### 2.1 User Flow (New)

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "📄 Upload PDF" or drags file               │
│                         ↓                                   │
│  2. PDF extracted → cleanup applied → preview in input box  │
│                         ↓                                   │
│  3. User reviews/edits text (optional)                      │
│                         ↓                                   │
│  4. User clicks "✨ Simplify" → output appears              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 UI Mockup

```
┌──────────────────────────────────────────────────────────────┐
│  📝 KlarText Demo                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📄 Upload PDF                    [Browse...] or drop  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Original Text / Originaltext                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  (extracted & cleaned text appears here)               │  │
│  │                                                        │  │
│  │  User can edit before simplifying...                   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Output Language: (•) German  ( ) English                    │
│                                                              │
│  [✨ Simplify Text / Text vereinfachen]                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Design

### 3.1 Library Selection

**Recommended:** `pymupdf` (formerly imported as `fitz`)

| Library | Pros | Cons |
|---------|------|------|
| **pymupdf** ✓ | Fast, position data for header/footer detection, handles most PDFs | Larger dependency |
| pdfplumber | Good for tables | Slower, less position control |
| pypdf | Lightweight | Basic extraction, no position data |

**Why pymupdf:**
- Provides text block positions (x, y coordinates)
- Position data enables header/footer detection
- Fast extraction even for large documents
- Handles most PDF types well
- Active maintenance

### 3.2 Text Cleanup Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PDF File                                                  │
│      │                                                      │
│      ▼                                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. HEADER/FOOTER REMOVAL                           │   │
│   │     • Extract text blocks with positions            │   │
│   │     • Filter blocks in top/bottom margins           │   │
│   │     • Configurable margin percentage (default 8%)   │   │
│   └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  2. DE-HYPHENATION                                  │   │
│   │     • Detect "word-\n" patterns                     │   │
│   │     • Join split words across lines                 │   │
│   │     • Preserve intentional hyphens                  │   │
│   └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  3. WHITESPACE NORMALIZATION                        │   │
│   │     • Single newlines → spaces (within paragraphs)  │   │
│   │     • Multiple newlines → paragraph breaks          │   │
│   │     • Collapse multiple spaces                      │   │
│   │     • Strip leading/trailing whitespace             │   │
│   └─────────────────────────────────────────────────────┘   │
│      │                                                      │
│      ▼                                                      │
│   Cleaned Text → Input Textbox                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Cleanup Rules Detail

| Step | Pattern | Replacement | Example |
|------|---------|-------------|---------|
| De-hyphenate | `(\w)-\n(\w)` | `\1\2` | `"Versiche-\nrung"` → `"Versicherung"` |
| Join lines | `(?<!\n)\n(?!\n)` | ` ` (space) | Single newline → space |
| Collapse breaks | `\n{3,}` | `\n\n` | 3+ newlines → 2 |
| Collapse spaces | `[ \t]+` | ` ` | Multiple spaces → one |
| Trim lines | `^ +\| +$` | (empty) | Leading/trailing spaces |

### 3.4 Component Structure

```
demo/
├── app.py                    # Main Gradio app (modified)
├── requirements.txt          # Add pymupdf dependency
└── pdf_utils.py              # NEW: PDF extraction module
```

**New module: `demo/pdf_utils.py`**
```python
"""
PDF text extraction with cleanup for KlarText demo.
"""

import re
import fitz  # pymupdf


def extract_pdf_text(pdf_path: str, margin_pct: float = 0.08) -> str:
    """
    Extract and clean text from PDF.
    
    Args:
        pdf_path: Path to PDF file
        margin_pct: Percentage of page height to treat as header/footer zone
    
    Returns:
        Cleaned text string
    """
    ...


def clean_extracted_text(text: str) -> str:
    """Apply cleanup transformations to extracted text."""
    ...
```

---

## 4. Implementation Details

### 4.1 PDF Extraction Function

```python
import fitz  # pymupdf

def extract_pdf_text(pdf_path: str, margin_pct: float = 0.08) -> str:
    """
    Extract text from PDF with header/footer removal.
    
    Args:
        pdf_path: Path to PDF file
        margin_pct: Percentage of page height for header/footer margins
    
    Returns:
        Extracted text with headers/footers removed
    """
    doc = fitz.open(pdf_path)
    all_text = []
    
    for page in doc:
        height = page.rect.height
        margin = height * margin_pct
        
        # Get text blocks with positions: (x0, y0, x1, y1, text, block_no, block_type)
        blocks = page.get_text("blocks")
        
        page_text = []
        for block in blocks:
            y0 = block[1]  # Top of block
            y1 = block[3]  # Bottom of block
            text = block[4]
            
            # Skip header zone (top margin)
            if y0 < margin:
                continue
            
            # Skip footer zone (bottom margin)
            if y1 > (height - margin):
                continue
            
            page_text.append(text)
        
        all_text.append("\n".join(page_text))
    
    doc.close()
    
    # Join pages and apply text cleanup
    raw_text = "\n\n".join(all_text)
    return clean_extracted_text(raw_text)
```

### 4.2 Text Cleanup Function

```python
import re

def clean_extracted_text(text: str) -> str:
    """
    Apply cleanup transformations to extracted text.
    
    Steps:
    1. De-hyphenate words split across lines
    2. Normalize line breaks (preserve paragraphs)
    3. Normalize whitespace
    """
    
    # 1. De-hyphenate: join "word-\n" patterns
    # Matches: word character, hyphen, newline, word character
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    
    # 2. Normalize line breaks
    # Single newlines within paragraphs → space
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # 3+ consecutive newlines → 2 (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 3. Normalize whitespace
    # Multiple spaces/tabs → single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove trailing spaces from lines
    text = re.sub(r' +\n', '\n', text)
    # Remove leading spaces from lines
    text = re.sub(r'\n +', '\n', text)
    
    return text.strip()
```

### 4.3 Gradio Integration

**Add to `demo/app.py`:**

```python
from pdf_utils import extract_pdf_text

# In create_demo() function:

# Add PDF upload component (before input_text)
pdf_upload = gr.File(
    label="📄 Upload PDF (optional)",
    file_types=[".pdf"],
    type="filepath",
)

# Event handler for PDF upload
def handle_pdf_upload(pdf_file):
    """Extract text from uploaded PDF."""
    if pdf_file is None:
        return gr.update()  # No change to textbox
    
    try:
        text = extract_pdf_text(pdf_file)
        if not text.strip():
            return "⚠️ No text could be extracted from this PDF."
        return text
    except Exception as e:
        return f"❌ Error extracting PDF: {str(e)}"

# Wire up event
pdf_upload.change(
    fn=handle_pdf_upload,
    inputs=[pdf_upload],
    outputs=[input_text],
)
```

---

## 5. Implementation Plan

### Phase 1: Core Extraction (2-3 hours)
**Goal:** Basic PDF upload and extraction working

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add `pymupdf` to requirements.txt | 5m | None |
| Create `demo/pdf_utils.py` with extraction | 1h | pymupdf |
| Add unit tests for extraction | 30m | pdf_utils.py |
| Integrate into Gradio UI | 30m | pdf_utils.py |
| Test with sample PDFs | 30m | Integration |

**Deliverables:**
- `demo/pdf_utils.py` with `extract_pdf_text()` and `clean_extracted_text()`
- PDF upload button in demo UI
- Basic error handling

### Phase 2: Refinement (1-2 hours)
**Goal:** Polish and edge case handling

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add extraction status indicator | 30m | Phase 1 |
| Handle empty PDFs gracefully | 15m | Phase 1 |
| Handle encrypted/protected PDFs | 15m | Phase 1 |
| Test with German documents | 30m | Phase 1 |
| Update README documentation | 15m | Phase 1 |

**Deliverables:**
- Robust error handling
- User feedback for edge cases
- Updated documentation

---

## 6. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `demo/requirements.txt` | Modify | Add `pymupdf>=1.24.0` |
| `demo/pdf_utils.py` | Create | PDF extraction module (~60 lines) |
| `demo/app.py` | Modify | Add upload component + handler (~20 lines) |
| `demo/README.md` | Modify | Document PDF feature |

---

## 7. Testing Plan

### 7.1 Unit Tests

```python
# tests/test_pdf_utils.py

def test_clean_dehyphenate():
    """Test hyphenated word joining."""
    text = "Versiche-\nrung"
    result = clean_extracted_text(text)
    assert result == "Versicherung"

def test_clean_preserve_paragraph():
    """Test paragraph preservation."""
    text = "First paragraph.\n\nSecond paragraph."
    result = clean_extracted_text(text)
    assert "\n\n" in result

def test_clean_normalize_whitespace():
    """Test whitespace collapsing."""
    text = "Too   many    spaces"
    result = clean_extracted_text(text)
    assert result == "Too many spaces"
```

### 7.2 Integration Tests

| Test Case | Expected Result |
|-----------|-----------------|
| Upload valid PDF | Text appears in input box |
| Upload empty PDF | Warning message displayed |
| Upload image-only PDF | Warning about no text |
| Upload encrypted PDF | Error message with explanation |
| Upload non-PDF file | Rejected by file filter |

### 7.3 Sample Documents for Testing

Use existing `data/samples/` content saved as PDFs, or create test PDFs from:
- German government forms
- Medical information sheets
- Insurance policy documents
- Legal contracts

---

## 8. Future Enhancements

### 8.1 Not in Scope (MVP)

| Feature | Why Deferred |
|---------|--------------|
| OCR for scanned PDFs | Requires `pytesseract`, adds complexity |
| Page range selection | Adds UI complexity |
| Multi-file upload | Single document focus for MVP |
| Table extraction | Complex layout handling |

### 8.2 Potential Future Features

1. **OCR Fallback** - Detect image-only PDFs and offer OCR (requires pytesseract + Tesseract)
2. **Page Selection** - Let users specify pages 1-5, or exclude certain pages
3. **Extraction Preview** - Show page thumbnails with detected text regions
4. **Quality Indicator** - Warn if extraction looks garbled or incomplete
5. **Batch Processing** - Upload multiple documents for bulk simplification

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PDF extraction fails | Medium | Low | Graceful error message, user can paste manually |
| Headers/footers not removed | Medium | Low | Adjustable margin setting |
| Non-text PDFs (scanned) | Medium | Medium | Clear message explaining limitation |
| Large PDFs slow to process | Low | Low | Consider page limit or async processing |

---

## 10. Success Criteria

### MVP Complete When:
- [ ] User can upload PDF via button
- [ ] Text extracted with basic cleanup applied
- [ ] Extracted text appears in input textbox
- [ ] User can edit text before simplifying
- [ ] Error handling for invalid/empty PDFs
- [ ] README updated with PDF feature

### Quality Metrics:
- Extraction works for >90% of text-based PDFs
- De-hyphenation correctly joins split words
- Headers/footers removed from standard documents
- User can simplify extracted text without manual editing (for well-formatted PDFs)

---

## Appendix A: Alternative Libraries Considered

### pymupdf (Recommended)
```python
import fitz
doc = fitz.open("document.pdf")
for page in doc:
    blocks = page.get_text("blocks")  # Includes position data
```
✅ Position data for header/footer detection  
✅ Fast extraction  
✅ Good documentation  

### pdfplumber
```python
import pdfplumber
with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
```
✅ Good for tables  
❌ Slower than pymupdf  
❌ Less control over text block positions  

### pypdf
```python
from pypdf import PdfReader
reader = PdfReader("document.pdf")
for page in reader.pages:
    text = page.extract_text()
```
✅ Lightweight  
❌ No position data  
❌ Basic extraction only  

---

## Appendix B: Regex Patterns Reference

| Pattern | Purpose | Example Match |
|---------|---------|---------------|
| `(\w)-\n(\w)` | Hyphenated line break | `"Ver-\nsicherung"` |
| `(?<!\n)\n(?!\n)` | Single newline (not paragraph) | `"line1\nline2"` |
| `\n{3,}` | 3+ consecutive newlines | `"para1\n\n\n\npara2"` |
| `[ \t]+` | Multiple spaces/tabs | `"word   word"` |
| `^ +` | Leading spaces | `"  text"` |
| ` +$` | Trailing spaces | `"text  "` |

---

*Document Version: 1.0*  
*Last Updated: January 8, 2026*
