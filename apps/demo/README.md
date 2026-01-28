# KlarText Gradio Demo

A shareable test interface for the team to evaluate text simplification with Groq.

## ✨ Key Feature: Live Template Sync

This demo **loads prompts directly from the project's template files**:
- `prompts/templates/simplify_de_fewshot.txt` (German)
- `prompts/templates/simplify_en_fewshot.txt` (English)

**Templates are loaded fresh on each request**, so you can:
1. Edit the template files
2. Test immediately in the demo (no restart needed)
3. See how changes affect output quality

## Quick Start

### 1. Install dependencies

```bash
cd demo
pip install -r requirements.txt
```

Or if using the project's virtual environment:

```bash
pip install gradio groq pybars3 pymupdf
```

### 2. Set your Groq API key

```bash
export GROQ_API_KEY="gsk_your_key_here"
```

Get a free API key at: https://console.groq.com/

### 3. Run locally

```bash
python app.py
```

Opens at http://localhost:7860

### 4. Share with the team

```bash
python app.py --share
```

This generates a public URL (like `https://abc123.gradio.live`) valid for ~72 hours.
Share this link with the team - no deployment needed!

### 5. Custom port

```bash
python app.py --port 8080
```

## Features

- **PDF upload:** Extract text from PDF documents with automatic cleanup
- **Two languages:** German and English simplification
- **Level I (Very Easy):** Uses few-shot templates with examples
- **Random samples:** Load diverse test texts (legal, medical, technical, etc.)
- **Quality scoring:** Automatic readability metrics after each simplification
- **Accessible UI:** 18px base font, good contrast

## PDF Upload

Upload a PDF document to automatically extract and clean the text for simplification.

**Cleanup applied:**
- **Header/footer removal:** Text in top/bottom margins is filtered out
- **De-hyphenation:** Words split across lines (e.g., "Ver-\nsicherung") are joined
- **Whitespace normalization:** Extra spaces and line breaks are cleaned up

**Usage:**
1. Click "Upload PDF" or drag a PDF file
2. Extracted text appears in the input box
3. Review/edit if needed
4. Click "Simplify" to process

**Note:** Works best with text-based PDFs. Scanned documents (images) are not supported.

## Quality Scoring

After each simplification, the demo displays quality metrics based on Easy Language standards:

| Metric | Target | Description |
|--------|--------|-------------|
| Avg sentence length | ≤ 15 words | Short sentences are easier to understand |
| Long sentences | ≤ 10% | Percentage of sentences over 20 words |
| LIX score | ≤ 40 | Readability index (lower = easier) |

Scores show ✅ Good, ⚠️ Review, or ❌ Needs work based on how many checks pass.

## Model

Uses **Llama 3.1 8B Instant** (`llama-3.1-8b-instant`) via Groq's API.

**Why this model?**
Based on comprehensive evaluation in `notebooks/05_easy_language_evaluation.ipynb`:
- **Best LIX score**: 37.3 (lowest complexity, target: < 40)
- **Good structure**: Uses bullet points and clear formatting
- **Fast inference**: 0.25s average latency
- **Balanced output**: Maintains meaning while simplifying (vs. 70B which can be too concise)

See `docs/scoring_feedback_pipeline_proposal.md` for full model comparison.

## Customization

Edit `app.py` to:
- Change the model: Modify `GROQ_MODEL`
- Add sample texts: Drop `.txt` files in `data/samples/` and update `SAMPLE_CATEGORIES`
- Change styling: Modify `custom_css`

## Privacy Note

Text is sent to Groq's API for processing. Do not enter sensitive personal data.