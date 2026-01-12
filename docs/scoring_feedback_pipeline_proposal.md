# Scoring & Feedback Pipeline Proposal

**Status:** In Progress (Phase 4 - Logging Endpoint Implemented)  
**Date:** January 8, 2026 (Updated: January 10, 2026)  
**Author:** KlarText Team

---

## Summary

This document outlines a proposal for integrating automated quality scoring into the KlarText text simplification pipeline. The goal is to provide immediate, actionable feedback on simplified text quality—enabling iterative improvement of prompts, benchmarks, and guardrails.

**Key Benefits:**
- Real-time quality feedback during testing
- Data-driven prompt optimization
- Automated guardrail enforcement
- Foundation for A/B testing different simplification approaches

**Recent Updates (January 10, 2026):**
- **Implemented `/v1/log-run` API endpoint** for collecting performance data
- Privacy-first design: only SHA256 hashes stored, no raw user text
- Supports JSONL file storage (MVP) and PostgreSQL (production)
- Next: Integrate logging into demo and API simplification endpoints
- See Section 5.3 for implementation details and usage examples

**Implementation Approach:**
- Shared scoring/logging library implemented first
- Integrate into Gradio (MVP), then reuse in website/API
- JSONL as source of truth, no premature dashboards
- Human-in-the-loop governance for prompt changes
- Strict versioning discipline (SHA256 refs for all assets)

**Key Decisions:**
Below are items that still need to be decided on implementation direction:
- Privacy approach (under review - see Section 10.1)
- Metrics timing strategy (under review - see Section 10.2)  
---

## 1. Current State

### 1.1 What Exists Today

| Component | Location | Status | Description |
|-----------|----------|--------|-------------|
| **Gradio Demo** | `demo/app.py` | ✅ Working | Interactive UI for text simplification with basic scoring |
| **Prompt Templates** | `prompts/templates/*.txt` | ✅ Working | Handlebars templates for German & English |
| **Basic Scoring** | `demo/app.py` | ✅ Working | Simple metrics (sentence length, LIX, % long sentences) |
| **HIX Evaluation** | `notebooks/04_hix_evaluation_test.ipynb` | ✅ Working | German readability scoring based on HIX methodology |
| **Full Evaluation Framework** | `notebooks/05_easy_language_evaluation.ipynb` | ✅ Working | Comprehensive multi-metric evaluation |
| **Model Comparison** | `scripts/run_model_comparison.py` | ✅ Working | Compare models on benchmark texts |
| **Benchmark Data** | `data/benchmark.jsonl` | ✅ Available | 5 English test sentences |
| **Calibration Corpora** | `data/easy/`, `data/hard/` | ✅ Available | Easy/hard text samples for threshold derivation |
| **Logging Endpoint** | `services/api/app/main.py` | ✅ Implemented but not yet connected | `/v1/log-run` endpoint for feedback loop data collection | 

### 1.2 Current Demo Scoring (First Pass)

The demo currently computes these metrics after each simplification:

```
┌─────────────────────────────────────────────┐
│  📊 Output Quality: ✅ Good                 │
│                                             │
│  Metric              Value    Target  Check │
│  ─────────────────────────────────────────  │
│  Avg sentence length  8.5     ≤ 15    ✓    │
│  Long sentences       0%      ≤ 10%   ✓    │
│  LIX readability      32.4    ≤ 40    ✓    │
│                                             │
│  5 sentences, 42 words • Checks: 3/3       │
└─────────────────────────────────────────────┘
```

### 1.3 Evaluation Notebook Metrics (Full Framework)

The `05_easy_language_evaluation.ipynb` notebook provides a more comprehensive set:

| Category | Metrics |
|----------|---------|
| **Readability** | Sentence count, word count, avg sentence length, % sentences > 20 words, avg word length, % words > 6 chars, LIX score |
| **Entity Load** | Unique entities per sentence, total entity mentions |
| **Semantic Focus** | n_topics, semantic_richness, semantic_clarity, semantic_noise, n_eff (effective topics) |
| **Meaning Preservation** | Embedding cosine similarity (sentence-transformers) or TF-IDF cosine similarity |
| **Linguistic Quality** | Negation rate, passive voice rate (extended metrics) |

### 1.4 Model Selection & Prompt Structure

Based on comprehensive evaluation in `notebooks/05_easy_language_evaluation.ipynb` and `notebooks/07_model_scoring.ipynb`, the project has standardized on specific model and prompt structure choices.

#### Recommended Model: `llama-3.1-8b-instant`

**Evaluation Results:**
| Model | LIX Score | Avg Sent Length | % Long Sent | Latency | Notes |
|-------|-----------|-----------------|-------------|---------|-------|
| **llama-3.1-8b-instant** | **37.3** | 12.0 words | 5.0% | 0.25s | Best LIX, good structure with bullet points |
| llama-3.3-70b-versatile | 40.9 | 10.0 words | 0.0% | 0.21s | Very short outputs, may lose information |
| qwen3-32b | 37.5 | 8.7 words | 3.6% | 0.96s | Includes reasoning tags, good LIX |

**Target:** LIX < 40, Avg Sentence Length < 15 words, Long Sentences < 10%

**Why llama-3.1-8b-instant?**
- **Best LIX score** (37.3) - lowest complexity
- **Better structure** - uses bullet points and clear formatting
- **Fast inference** - 0.25s average latency
- **Good balance** - maintains meaning while simplifying
- **Consistent output** - reliable formatting without extra metadata

The 70B model produces extremely concise output but may lose essential information. The 8B model provides better balance between simplification and completeness.

**Implementation:**
```python
# demo/app.py
GROQ_MODEL = "llama-3.1-8b-instant"
```

#### Prompt Structure: System + User Split

The project uses a **split prompt structure** separating system and user messages:

```python
messages = [
    {"role": "system", "content": system_prompt},  # Identity, rules, examples
    {"role": "user", "content": user_prompt}        # Specific task with text
]
```

**System Prompt Contains:**
- Identity: Expert role definition
- Instructions: Core task and constraints
- Plain Language Rules: Detailed simplification guidelines
- Examples: Few-shot demonstrations

**User Prompt Contains:**
- Simple task instruction: "Rewrite the following text in simple language:"
- The input text to simplify

**Why Split Structure?**

1. **Model Behavior**: LLMs treat system messages as persistent identity/constraints that take priority over user requests
2. **Evaluation Alignment**: All evaluation notebooks (`02_final_prompt_evaluation.ipynb`, `03_prompt_scoring.ipynb`, `07_model_scoring.ipynb`) use this structure
3. **Best Practices**: Separation of concerns - persistent behavior (system) vs. specific task (user)
4. **Consistency**: Quality scores and model comparisons are based on this approach
5. **Maintainability**: Rules and examples can be updated independently of task instructions

**Template Files:**
- English (split): `prompts/templates/system_prompt_en.txt` + `prompts/templates/user_prompt_en.txt`
- German (split): `prompts/templates/system_prompt_de.txt` + `prompts/templates/user_prompt_de.txt`(these still need to be reviewed and updated to reflect german specific details)

**Note:** While single-message prompts can work well for modern models, the split structure ensures the demo behaves identically to the evaluated configuration, providing confidence in quality metrics and benchmarks.

---

## 2. Proposed Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KLARTEXT SCORING PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │   INPUT     │     │    LLM      │     │   OUTPUT    │                  │
│   │   TEXT      │────▶│ SIMPLIFIER  │────▶│   TEXT      │                  │
│   └─────────────┘     └─────────────┘     └──────┬──────┘                  │
│                                                  │                          │
│                                                  ▼                          │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                        SCORING MODULE                                 │ │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │ │
│   │  │ Readability  │  │  Semantic    │  │   Meaning    │               │ │
│   │  │   Metrics    │  │   Focus      │  │ Preservation │               │ │
│   │  └──────────────┘  └──────────────┘  └──────────────┘               │ │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │ │
│   │  │   Entity     │  │  Linguistic  │  │   Custom     │               │ │
│   │  │    Load      │  │   Quality    │  │  Guardrails  │               │ │
│   │  └──────────────┘  └──────────────┘  └──────────────┘               │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                      GUARDRAIL EVALUATOR                              │ │
│   │   • Compare metrics against thresholds                               │ │
│   │   • Derived from Easy Language corpus (data/easy/)                   │ │
│   │   • Pass/Fail decisions with explanations                            │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                       FEEDBACK GENERATOR                              │ │
│   │   • Human-readable quality summary                                   │ │
│   │   • Specific improvement suggestions                                 │ │
│   │   • Metric breakdown with targets                                    │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │    Demo     │     │   Logging   │     │   Reports   │                  │
│   │     UI      │     │   (JSONL)   │     │    (CSV)    │                  │
│   └─────────────┘     └─────────────┘     └─────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### A. Scoring Module (`lib/scoring/`)

Proposed file structure:
```
lib/
└── scoring/
    ├── __init__.py
    ├── base.py              # Base scorer class
    ├── readability.py       # LIX, sentence length, word length
    ├── semantic.py          # Topic model, semantic metrics
    ├── entities.py          # Entity extraction and counting
    ├── meaning.py           # Meaning preservation (embeddings)
    ├── linguistic.py        # Negation, passive voice, etc.
    └── guardrails.py        # Threshold evaluation
```

#### B. Guardrail Configuration (`config/guardrails.yaml`)

```yaml
# Guardrail thresholds derived from Easy Language corpus
# Direction: "lower" = lower is better, "higher" = higher is better

readability:
  avg_sentence_len_words:
    threshold: 15.0
    direction: lower
    severity: error
    message: "Sentences too long for Easy Language"
  
  pct_sentences_gt20:
    threshold: 0.10
    direction: lower
    severity: error
    message: "Too many long sentences (>20 words)"
  
  lix:
    threshold: 40.0
    direction: lower
    severity: warning
    message: "LIX score indicates difficult text"

meaning:
  meaning_cosine:
    threshold: 0.70
    direction: higher
    severity: error
    message: "Output may have lost important meaning"

linguistic:
  passive_rate:
    threshold: 0.15
    direction: lower
    severity: warning
    message: "Too much passive voice"
  
  negation_rate:
    threshold: 0.10
    direction: lower
    severity: warning
    message: "Too many negations"
```

#### C. Feedback Generator

Output format for different contexts:

**Demo UI (Markdown):**
```markdown
### 📊 Output Quality: ✅ Good

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Avg sentence length | **8.5** words | ≤ 15 | ✓ |
| Long sentences | **0%** | ≤ 10% | ✓ |
| LIX readability | **32.4** | ≤ 40 | ✓ |
| Meaning preserved | **0.85** | ≥ 0.70 | ✓ |

*5 sentences, 42 words • All checks passed*
```

**Structured Log (JSONL):**
```json
{
  "timestamp": "2026-01-08T14:30:00Z",
  "source_text": "...",
  "output_text": "...",
  "model": "llama-3.3-70b-versatile",
  "template": "simplify_de_fewshot.txt",
  "metrics": {
    "avg_sentence_len_words": 8.5,
    "pct_sentences_gt20": 0.0,
    "lix": 32.4,
    "meaning_cosine": 0.85
  },
  "guardrails_passed": 4,
  "guardrails_total": 4,
  "guardrails_failed": []
}
```

---

## 3. Implementation Phases

### Phase 1: Extract & Modularize
**Goal:** Extract scoring from demo into reusable module

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create `lib/scoring/` package structure | 2h | None |
| Extract `readability.py` from demo | 2h | None |
| Add unit tests for readability | 2h | readability.py |
| Create base scorer interface | 1h | None |
| Update demo to use new module | 1h | Package created |

**Deliverables:**
- `lib/scoring/readability.py` with tests
- Demo using modular scorer

### Phase 2: Expand Metrics
**Goal:** Add semantic and meaning preservation metrics

| Task | Effort | Dependencies |
|------|--------|--------------|
| Port `semantic.py` from notebook | 4h | Phase 1 |
| Port `meaning.py` (embeddings) | 3h | Phase 1 |
| Port `entities.py` (spaCy/heuristic) | 2h | Phase 1 |
| Add `linguistic.py` (negation, passive) | 2h | Phase 1 |
| Integration tests | 2h | All metrics |

**Deliverables:**
- Full metric suite in `lib/scoring/`
- Optional dependencies (spacy, sentence-transformers) handled gracefully

### Phase 3: Guardrails & Feedback
**Goal:** Implement guardrail evaluation and feedback generation

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create `config/guardrails.yaml` schema | 2h | Phase 2 |
| Implement `guardrails.py` evaluator | 3h | Schema |
| Create feedback formatter (Markdown, JSON) | 2h | Evaluator |
| Derive thresholds from `data/easy/` corpus | 2h | Evaluator |
| Update demo with full feedback | 2h | Formatter |

**Deliverables:**
- Configurable guardrails with YAML config
- Rich feedback in demo UI
- Threshold derivation script

### Phase 4: Logging & Analysis
**Goal:** Enable systematic data collection for analysis

| Task | Effort | Dependencies |
|------|--------|--------------|
| ✅ Implement `/v1/log-run` endpoint | DONE | Phase 3 |
| Integrate logging in demo | 2h | `/v1/log-run` endpoint |
| Integrate logging in API `/v1/simplify` | 1h | `/v1/log-run` endpoint |
| Create analysis notebook | 3h | Logging data |
| Dashboard for metric trends | 4h | Analysis |
| A/B test framework for prompts | 4h | Logging |

---

## 3A. Detailed Implementation Breakdown (Epic Structure)

This section provides ticket-level breakdown for Phases 1-4, organized as epics with acceptance criteria and rationale. The breakdown follows the "shared scoring/logging module → integrate into Gradio → reuse in API/website" approach with strict versioning.

**Implementation Approach:**
- Shared scoring/logging library implemented first
- Integrate into Gradio (MVP), then reuse in website/API
- JSONL as source of truth, no premature dashboards
- Human-in-the-loop governance for prompt changes
- Strict versioning discipline (SHA256 refs for all assets)

**Key Decisions Status:**
- Privacy approach (under review - see Section 10.1)
- Metrics timing strategy (under review - see Section 10.2)

---

### Epic 1: Feedback Loop Foundation (MUST HAVE)

**Goal:** Establish run schema with versioning as the backbone of the feedback system. Every simplification run produces one structured record that can be re-scored later.

**Why this is the foundation:**
- Prevents inconsistent logs across Gradio/API/web
- Enables re-scoring old runs when metrics evolve
- Makes experiments reproducible and comparable

#### Story 1.1 — Define RunRecord Schema

**Acceptance Criteria:**
- [ ] Single Pydantic model for all run data
- [ ] JSON schema export available
- [ ] Backward compatibility strategy documented

**Why it matters:**
- Avoids "everyone logs slightly different stuff" → can't analyze later
- Single source of truth for "what is a run"
- Enables rollback and comparison

**Files to create:**
- `lib/models/__init__.py`
- `lib/models/run_record.py`

**Implementation:**

```python
# lib/models/run_record.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
import uuid

class RunRecord(BaseModel):
    """Complete record of a single simplification run."""
    
    # Identity
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Source
    surface: str  # "gradio" | "api" | "web"
    session_id: Optional[str] = None
    
    # Input metadata
    lang: str  # "en" | "de"
    category: str = "unknown"  # Start simple, expand later
    input_length_bucket: str  # "short" | "medium" | "long" (auto-computed)
    
    # Model configuration
    model_provider: str  # "groq"
    model_name: str  # "llama-3.1-8b-instant"
    model_params: Optional[Dict] = None
    
    # Asset versioning (SHA256 refs)
    prompt_ref: str  # "prompts/en/v1/system.md:sha256:abc123..."
    ruleset_ref: str  # "rulesets/v1.yaml:sha256:def456..."
    guardrails_ref: str  # "guardrails/v1.yaml:sha256:ghi789..."
    
    # Content (see Section 10.1 for privacy decision)
    input_text: str  # ⚠️ Decision needed: store full text or hash
    output_text: str  # ⚠️ Decision needed: store full text or hash
    
    # Quality metrics
    metrics: Dict[str, float]  # Flexible dict for evolving metrics
    guardrail_results: Dict  # Pass/fail + triggered rules
    
    # Performance
    latency_ms: int
    token_usage: Optional[Dict[str, int]] = None
    
    # Status
    status: str = "success"  # "success" | "error"
    error_message: Optional[str] = None
```

---

#### Story 1.2 — Implement Asset Versioning

**Acceptance Criteria:**
- [ ] Changing a prompt file changes its SHA256
- [ ] Every run record contains prompt/rules/guardrails SHA refs
- [ ] Asset registry can load by (type, lang, version)

**Why it matters:**
- Without SHA refs, you can't prove what improved what
- Prevents silent drift across machines/branches
- Enables confident rollback: "This SHA worked better"

**Files to create:**
- `lib/versioning/__init__.py`
- `lib/versioning/asset_registry.py`

**Implementation:**

```python
# lib/versioning/asset_registry.py
import hashlib
from pathlib import Path
from typing import NamedTuple

class AssetRef(NamedTuple):
    id: str          # "prompts/en/v1/system.md"
    version: str     # "v1"
    sha256: str      # First 16 chars of SHA256

class AssetRegistry:
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        
    def load_asset(self, asset_type: str, lang: str, version: str) -> AssetRef:
        """Load asset and compute SHA256."""
        # Example: asset_type="prompt", lang="en", version="v1"
        path = self.repo_root / f"{asset_type}s" / lang / version / "system.md"
        
        if not path.exists():
            raise FileNotFoundError(f"Asset not found: {path}")
        
        content = path.read_text()
        sha256 = hashlib.sha256(content.encode()).hexdigest()
        
        return AssetRef(
            id=str(path.relative_to(self.repo_root)),
            version=version,
            sha256=sha256[:16]  # First 16 chars for readability
        )
```

**Directory structure to maintain:**
```
prompts/
├── en/v1/, de/v1/  (already exists)
rulesets/
└── v1.yaml  (already exists)
guardrails/
└── v1.yaml  (create if needed)
```

---

#### Story 1.3 — Define Config Precedence Rules

**Acceptance Criteria:**
- [ ] One function resolves effective config for (lang, category)
- [ ] Precedence: base → lang → category → runtime overrides
- [ ] Runtime overrides only work in dev mode (not production)

**Why it matters:**
- Avoids "German thresholds accidentally applied to English" bugs
- Prevents hidden overrides that break reproducibility
- Deterministic threshold resolution

**Files to create:**
- `lib/guardrails/config_resolver.py`

**Files to update:**
- `guardrails/v1.yaml` (add language/category structure)

**Implementation:**

Update `guardrails/v1.yaml`:
```yaml
# Base defaults (language-agnostic)
base:
  max_avg_sentence_len: 20
  max_pct_long_sentences: 0.15

# Language-specific overrides
languages:
  en:
    lix_max: 40
    max_avg_sentence_len: 15  # Stricter for English
    
  de:
    hix_max: 40  # Use HIX for German
    max_avg_sentence_len: 18  # Slightly more lenient

# Category-specific overrides (optional)
categories:
  legal:
    max_avg_sentence_len: 20  # Legal text needs flexibility
    
  medical:
    meaning_similarity_min: 0.85  # Higher accuracy requirement
```

Create `lib/guardrails/config_resolver.py`:
```python
import os

def resolve_config(lang: str, category: str, guardrails_config: dict, 
                   overrides: dict = None) -> dict:
    """
    Resolve effective guardrails config with precedence:
    base → lang → category → overrides (dev only)
    """
    config = guardrails_config["base"].copy()
    
    # Apply language overrides
    if lang in guardrails_config.get("languages", {}):
        config.update(guardrails_config["languages"][lang])
    
    # Apply category overrides
    if category in guardrails_config.get("categories", {}):
        config.update(guardrails_config["categories"][category])
    
    # Apply runtime overrides (only in dev mode)
    if overrides and os.getenv("KLT_ENV") == "development":
        config.update(overrides)
    
    return config
```

---

### Epic 2: Extract Scoring Library (Week 2 Priority)

**Goal:** One scoring implementation reused by Gradio, API, and batch evaluator.

#### Story 2.1 — Create Base Scorer Interface

**Acceptance Criteria:**
- [ ] Base `Scorer` class with common interface
- [ ] `ScoreResult` dataclass for outputs
- [ ] Demo app imports only from `lib/scoring`

**Why it matters:**
- Prevents duplicate scoring logic across Gradio and API
- Testable in isolation
- Easy to add new metrics later

**Files to create:**
- `lib/scoring/__init__.py`
- `lib/scoring/base.py`

**Implementation:**

```python
# lib/scoring/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class ScoreResult:
    """Result from scoring a single text."""
    metrics: Dict[str, float]
    warnings: List[str] = None
    errors: List[str] = None

class BaseScorer(ABC):
    """Base interface for all scorers."""
    
    @abstractmethod
    def score(self, text: str, lang: str, **kwargs) -> ScoreResult:
        """Compute metrics for text."""
        pass
    
    @abstractmethod
    def get_metric_names(self) -> List[str]:
        """Return list of metric names this scorer produces."""
        pass
```

---

#### Story 2.2 — Move Readability Metrics to Library

**Acceptance Criteria:**
- [ ] Language-aware readability (EN: LIX, DE: HIX)
- [ ] Unit tests pass in CI
- [ ] Gradio displays same metrics as before

**Why it matters:**
- Prevents "we changed scoring and didn't notice"
- Enables reuse across surfaces
- Testable and maintainable

**Files to create:**
- `lib/scoring/readability.py`
- `tests/test_readability.py`
- `tests/__init__.py`

**Files to modify:**
- `demo/app.py` - Replace inline scoring with `ReadabilityScorer`

**Implementation:**

```python
# lib/scoring/readability.py
from .base import BaseScorer, ScoreResult
from typing import List
import re

class ReadabilityScorer(BaseScorer):
    """Language-aware readability metrics."""
    
    def score(self, text: str, lang: str, **kwargs) -> ScoreResult:
        sentences = self._split_sentences(text, lang)
        words = self._get_words(text)
        
        if not sentences or not words:
            return ScoreResult(metrics={}, errors=["Empty text"])
        
        metrics = {
            "sentence_count": len(sentences),
            "word_count": len(words),
            "avg_sentence_len_words": len(words) / len(sentences),
            "pct_sentences_gt20": self._pct_long_sentences(sentences, words),
            "avg_word_len_chars": sum(len(w) for w in words) / len(words),
            "pct_words_gt6": sum(1 for w in words if len(w) > 6) / len(words)
        }
        
        # Language-specific readability
        if lang == "en":
            metrics["lix"] = self._compute_lix(sentences, words)
        elif lang == "de":
            metrics["hix"] = self._compute_hix(sentences, words)
        
        return ScoreResult(metrics=metrics)
    
    def _compute_lix(self, sentences: List[str], words: List[str]) -> float:
        """LIX = (words/sentences) + (long_words * 100 / words)"""
        long_words = sum(1 for w in words if len(w) > 6)
        return (len(words) / len(sentences)) + \
               (long_words * 100.0 / len(words))
    
    def _compute_hix(self, sentences: List[str], words: List[str]) -> float:
        """HIX - German readability index (similar to LIX)."""
        # Use existing HIX implementation from notebooks
        long_words = sum(1 for w in words if len(w) > 6)
        return (len(words) / len(sentences)) + \
               (long_words * 100.0 / len(words))
    
    def _split_sentences(self, text: str, lang: str) -> List[str]:
        """Language-aware sentence splitting."""
        # Simple split on .!? for now
        # TODO: Use language-specific rules
        return [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    def _get_words(self, text: str) -> List[str]:
        """Extract words from text."""
        return [w for w in re.findall(r'\w+', text)]
    
    def _pct_long_sentences(self, sentences: List[str], words: List[str]) -> float:
        """Percentage of sentences with >20 words."""
        sentence_words = [len(self._get_words(s)) for s in sentences]
        long_count = sum(1 for l in sentence_words if l > 20)
        return long_count / len(sentences) if sentences else 0
    
    def get_metric_names(self) -> List[str]:
        return [
            "sentence_count", "word_count", "avg_sentence_len_words",
            "pct_sentences_gt20", "avg_word_len_chars", "pct_words_gt6",
            "lix", "hix"
        ]
```

Create tests:
```python
# tests/test_readability.py
import pytest
from lib.scoring.readability import ReadabilityScorer

def test_english_readability():
    scorer = ReadabilityScorer()
    text = "This is a test. It has short sentences."
    result = scorer.score(text, lang="en")
    
    assert result.metrics["sentence_count"] == 2
    assert result.metrics["lix"] > 0
    assert "hix" not in result.metrics  # EN doesn't compute HIX

def test_german_readability():
    scorer = ReadabilityScorer()
    text = "Das ist ein Test. Es hat kurze Sätze."
    result = scorer.score(text, lang="de")
    
    assert result.metrics["sentence_count"] == 2
    assert result.metrics["hix"] > 0
    assert "lix" not in result.metrics  # DE doesn't compute LIX

def test_empty_text():
    scorer = ReadabilityScorer()
    result = scorer.score("", lang="en")
    assert result.errors is not None
```

---

### Epic 3: Guardrails as Config

#### Story 3.1 — Implement Guardrails Evaluator

**Acceptance Criteria:**
- [ ] Pass/warn/fail based on YAML thresholds
- [ ] Run record includes which rules triggered
- [ ] Threshold changes require only config change (no code)

**Why it matters:**
- Stops hardcoded "magic numbers" spread across code
- Makes prompt iteration measurable
- Config-driven quality gates

**Files to create:**
- `lib/guardrails/evaluator.py`
- `lib/guardrails/__init__.py`

**Implementation:**

```python
# lib/guardrails/evaluator.py
from dataclasses import dataclass
from typing import List, Dict
import yaml

@dataclass
class GuardrailViolation:
    rule_id: str
    severity: str  # "warn" | "fail"
    metric_name: str
    value: float
    threshold: float
    direction: str  # "lower" | "higher"
    message: str

@dataclass
class GuardrailResult:
    passed: bool
    violations: List[GuardrailViolation]
    pass_count: int
    warn_count: int
    fail_count: int

class GuardrailEvaluator:
    def __init__(self, config_path: str):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
    
    def evaluate(self, metrics: Dict[str, float], lang: str, 
                 category: str = "unknown") -> GuardrailResult:
        """Evaluate metrics against guardrails."""
        from .config_resolver import resolve_config
        
        effective_config = resolve_config(lang, category, self.config)
        violations = []
        
        # Check each configured rule
        for rule_id, rule_config in effective_config.items():
            if rule_id not in metrics:
                continue
            
            value = metrics[rule_id]
            threshold = rule_config.get("threshold")
            direction = rule_config.get("direction", "lower")
            severity = rule_config.get("severity", "warn")
            
            # Check violation
            violated = (
                (direction == "lower" and value > threshold) or
                (direction == "higher" and value < threshold)
            )
            
            if violated:
                violations.append(GuardrailViolation(
                    rule_id=rule_id,
                    severity=severity,
                    metric_name=rule_id,
                    value=value,
                    threshold=threshold,
                    direction=direction,
                    message=rule_config.get("message", f"{rule_id} violated")
                ))
        
        fail_count = sum(1 for v in violations if v.severity == "fail")
        warn_count = sum(1 for v in violations if v.severity == "warn")
        
        return GuardrailResult(
            passed=(fail_count == 0),
            violations=violations,
            pass_count=len([k for k in effective_config.keys() if k in metrics]) - len(violations),
            warn_count=warn_count,
            fail_count=fail_count
        )
```

---

### Epic 4: JSONL Logging

#### Story 4.1 — Add JSONL Logger with Rotation

**Acceptance Criteria:**
- [ ] Append-only JSONL file
- [ ] Thread-safe writes
- [ ] Rotation by date (one file per day)
- [ ] Logs not committed to git

**Files to create:**
- `lib/logging/__init__.py`
- `lib/logging/jsonl_logger.py`

**Files to modify:**
- `.gitignore` - Add `logs/` and `*.jsonl`

**Implementation:**

```python
# lib/logging/jsonl_logger.py
import json
from pathlib import Path
from datetime import datetime
import fcntl
import os

class JSONLLogger:
    def __init__(self, log_dir: str = None):
        self.log_dir = Path(log_dir or os.getenv("KLT_LOG_DIR", "./logs"))
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def log(self, run_record: dict):
        """Append run record to today's JSONL file."""
        log_file = self._get_current_log_file()
        
        # Thread-safe append
        with open(log_file, "a") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                f.write(json.dumps(run_record) + "\n")
                f.flush()
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
    
    def _get_current_log_file(self) -> Path:
        """Get current day's log file (automatic rotation)."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        return self.log_dir / f"runs_{date_str}.jsonl"
```

Update `.gitignore`:
```
# Add these lines
logs/
*.jsonl
data/run_logs.jsonl
```

---

### Epic 5: Batch Analysis & Reports

**Goal:** Generate "worth mentioning" reports without manual log reading.

#### Story 5.1 — Build Batch Evaluator

**Acceptance Criteria:**
- [ ] Reads JSONL logs
- [ ] Can recompute metrics (important for evolving scoring)
- [ ] CLI tool with clear usage

**Files to create:**
- `tools/__init__.py`
- `tools/batch_eval.py`

**Implementation:**

```python
#!/usr/bin/env python3
# tools/batch_eval.py
"""
Batch evaluator - enriches JSONL logs with recomputed/heavy metrics.

Usage:
    python -m tools.batch_eval \
        --input logs/runs_2026-01-12.jsonl \
        --output outputs/eval_2026-01-12.jsonl \
        --compute-meaning  # Optional: add expensive metrics
"""

import json
import argparse
from pathlib import Path
from lib.scoring.readability import ReadabilityScorer

def main():
    parser = argparse.ArgumentParser(description="Batch evaluate run logs")
    parser.add_argument("--input", required=True, help="Input JSONL file")
    parser.add_argument("--output", required=True, help="Output JSONL file")
    parser.add_argument("--compute-meaning", action="store_true",
                       help="Compute expensive meaning similarity (slow)")
    args = parser.parse_args()
    
    scorer = ReadabilityScorer()
    enriched_count = 0
    
    with open(args.input) as f_in, open(args.output, "w") as f_out:
        for line in f_in:
            record = json.loads(line)
            
            # Recompute metrics (important if scoring evolved)
            if record.get("output_text") and record.get("lang"):
                fresh_scores = scorer.score(
                    text=record["output_text"],
                    lang=record["lang"]
                )
                record["metrics_recomputed"] = fresh_scores.metrics
                enriched_count += 1
            
            # TODO: Optionally add expensive metrics
            # if args.compute_meaning:
            #     meaning_score = compute_meaning_similarity(...)
            #     record["meaning_similarity"] = meaning_score
            
            f_out.write(json.dumps(record) + "\n")
    
    print(f"✅ Enriched {enriched_count} records")
    print(f"   Input:  {args.input}")
    print(f"   Output: {args.output}")

if __name__ == "__main__":
    main()
```

---

#### Story 5.2 — Generate Outlier Report

**Acceptance Criteria:**
- [ ] Short enough that humans will read it
- [ ] Lists prompt/rules/guardrails SHAs
- [ ] Top N failures with excerpts
- [ ] Three outputs: summary.json, report.md, optional metrics.csv

**Files to create:**
- `tools/report_outliers.py`

**Implementation:**

```python
#!/usr/bin/env python3
# tools/report_outliers.py
"""
Generate "worth mentioning" report from evaluated runs.

Usage:
    python -m tools.report_outliers \
        --input outputs/eval_2026-01-12.jsonl \
        --output reports/2026-01-12 \
        --top-n 10
"""

import json
import argparse
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

def compute_alert_score(record: dict) -> float:
    """Compute quality_alert_score for ranking outliers."""
    score = 0
    
    # Guardrail violations
    violations = record.get("guardrail_results", {}).get("violations", [])
    for v in violations:
        if v.get("severity") == "fail":
            score += 100
        elif v.get("severity") == "warn":
            score += 10
    
    # Distance from threshold for key metrics
    metrics = record.get("metrics", {})
    
    # LIX/HIX distance
    if "lix" in metrics:
        lix_max = 40
        if metrics["lix"] > lix_max:
            score += (metrics["lix"] - lix_max) * 2
    
    # Sentence length
    if "avg_sentence_len_words" in metrics:
        max_len = 15 if record.get("lang") == "en" else 18
        if metrics["avg_sentence_len_words"] > max_len:
            score += (metrics["avg_sentence_len_words"] - max_len) * 5
    
    # Meaning preservation (if available)
    if "meaning_similarity" in metrics:
        if metrics["meaning_similarity"] < 0.7:
            score += (0.7 - metrics["meaning_similarity"]) * 200
    
    return score

def main():
    parser = argparse.ArgumentParser(description="Generate outlier report")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--top-n", type=int, default=10)
    args = parser.parse_args()
    
    # Load all records
    records = []
    with open(args.input) as f:
        for line in f:
            records.append(json.loads(line))
    
    # Compute alert scores
    for r in records:
        r["_alert_score"] = compute_alert_score(r)
    
    # Sort by alert score
    records.sort(key=lambda r: r["_alert_score"], reverse=True)
    outliers = records[:args.top_n]
    
    # Aggregate stats
    total = len(records)
    failures = [r for r in records 
                if not r.get("guardrail_results", {}).get("passed", True)]
    
    by_lang = defaultdict(list)
    for r in records:
        by_lang[r.get("lang", "unknown")].append(r)
    
    # Count top violations
    all_violations = []
    for r in records:
        all_violations.extend(
            r.get("guardrail_results", {}).get("violations", [])
        )
    violation_counts = Counter(
        v.get("rule_id", "unknown") for v in all_violations
    )
    
    # Generate summary.json
    summary = {
        "report_id": datetime.now().isoformat(),
        "window": {"file": args.input},
        "counts": {
            "total_runs": total,
            "failures": len(failures),
            "success_rate": (total - len(failures)) / total if total > 0 else 0
        },
        "by_lang": {
            lang: {
                "run_count": len(runs),
                "failure_count": sum(
                    1 for r in runs 
                    if not r.get("guardrail_results", {}).get("passed", True)
                ),
            }
            for lang, runs in by_lang.items()
        },
        "top_violations": [
            {"rule_id": rule_id, "count": count}
            for rule_id, count in violation_counts.most_common(5)
        ],
        "worth_mentioning": [
            {
                "run_id": r.get("run_id", "unknown")[:8],
                "alert_score": r["_alert_score"],
                "lang": r.get("lang", "unknown"),
                "category": r.get("category", "unknown"),
                "prompt_sha": r.get("prompt_ref", "").split(":")[-1][:8],
                "metrics": r.get("metrics", {}),
                "violations": r.get("guardrail_results", {}).get("violations", []),
                "input_excerpt": (r.get("input_text", "") or "")[:100] + "...",
                "output_excerpt": (r.get("output_text", "") or "")[:100] + "..."
            }
            for r in outliers
        ]
    }
    
    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write summary.json
    with open(output_dir / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    # Write report.md
    with open(output_dir / "report.md", "w") as f:
        f.write(f"# Quality Report\n\n")
        f.write(f"**Generated:** {datetime.now().isoformat()}\n")
        f.write(f"**Source:** {args.input}\n\n")
        
        f.write(f"## Summary\n\n")
        f.write(f"- **Total runs:** {total}\n")
        f.write(f"- **Failures:** {len(failures)} ({len(failures)/total*100:.1f}%)\n")
        f.write(f"- **Success rate:** {summary['counts']['success_rate']*100:.1f}%\n\n")
        
        f.write(f"## By Language\n\n")
        for lang, stats in summary["by_lang"].items():
            f.write(f"### {lang.upper()}\n")
            f.write(f"- Runs: {stats['run_count']}\n")
            f.write(f"- Failures: {stats['failure_count']}\n\n")
        
        f.write(f"## Top Violations\n\n")
        for v in summary["top_violations"]:
            f.write(f"- **{v['rule_id']}:** {v['count']} times\n")
        
        f.write(f"\n## Top {args.top_n} Worth Mentioning\n\n")
        for i, item in enumerate(summary["worth_mentioning"], 1):
            f.write(f"### {i}. Run {item['run_id']} (score: {item['alert_score']:.0f})\n\n")
            f.write(f"- **Lang:** {item['lang']}\n")
            f.write(f"- **Category:** {item['category']}\n")
            f.write(f"- **Prompt SHA:** {item['prompt_sha']}\n")
            f.write(f"- **Violations:** {len(item['violations'])}\n")
            
            for v in item["violations"]:
                f.write(f"  - {v.get('severity', 'unknown').upper()}: {v.get('rule_id', 'unknown')} ")
                f.write(f"(value: {v.get('value', 0):.1f}, threshold: {v.get('threshold', 0):.1f})\n")
            
            f.write(f"\n**Input:** {item['input_excerpt']}\n\n")
            f.write(f"**Output:** {item['output_excerpt']}\n\n")
            f.write(f"---\n\n")
    
    print(f"✅ Generated report at {output_dir}")
    print(f"   - summary.json")
    print(f"   - report.md")

if __name__ == "__main__":
    main()
```

---

### Epic 6: A/B Testing Harness

**Goal:** Quantified "better/worse" comparisons for prompt versions.

#### Story 6.1 — Create Versioned Eval Set

**Acceptance Criteria:**
- [ ] ~30-100 samples with EN/DE mix
- [ ] Includes edge cases (numbers, dates, formatting)
- [ ] Versioned and documented

**Files to create:**
- `eval_set/v1.jsonl`
- `eval_set/README.md`

**Implementation:**

Create `eval_set/v1.jsonl`:
```jsonl
{"id": "en_001", "lang": "en", "category": "general", "text": "The meeting will be held on January 15th at 3:00 PM in Conference Room B."}
{"id": "en_002", "lang": "en", "category": "legal", "text": "The aforementioned party shall be held liable for any damages arising from breach of contract."}
{"id": "de_001", "lang": "de", "category": "general", "text": "Die Sitzung findet am 15. Januar um 15:00 Uhr in Konferenzraum B statt."}
{"id": "de_002", "lang": "de", "category": "medical", "text": "Der Patient sollte die Medikation zweimal täglich nach den Mahlzeiten einnehmen."}
```

Create `eval_set/README.md`:
```markdown
# Evaluation Set v1

**Purpose:** Stable test set for A/B testing prompt versions

**Composition:**
- 30-100 samples (expand over time)
- Mixed EN/DE
- Categories: general, legal, medical, technical
- Edge cases: numbers, dates, lists, formatting

**Usage:**
```bash
python -m tools.ab_runner --eval-set eval_set/v1.jsonl ...
```

**Versioning:**
- v1: Initial set (2026-01-12)
- Future versions will be clearly documented
```

---

#### Story 6.2 — Implement A/B Runner

**Acceptance Criteria:**
- [ ] One command compares two prompt versions
- [ ] Outputs delta report with examples
- [ ] Shows where each version wins

**Files to create:**
- `tools/ab_runner.py`

**(Note: This is a stub - full implementation requires integrating with actual simplification logic)**

```python
#!/usr/bin/env python3
# tools/ab_runner.py
"""
A/B test two prompt versions on eval set.

Usage:
    python -m tools.ab_runner \
        --eval-set eval_set/v1.jsonl \
        --prompt-a v1 \
        --prompt-b v2 \
        --output reports/ab_v1_vs_v2
"""

import json
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="A/B test prompt versions")
    parser.add_argument("--eval-set", required=True)
    parser.add_argument("--prompt-a", required=True, help="Prompt version A")
    parser.add_argument("--prompt-b", required=True, help="Prompt version B")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    print(f"Running A/B test: {args.prompt_a} vs {args.prompt_b}")
    print("⚠️  Full implementation requires integration with simplification API")
    print("    This is a template for the structure")
    
    # TODO: Implement full A/B testing logic
    # 1. Load eval set
    # 2. Run each sample through prompt A
    # 3. Run each sample through prompt B
    # 4. Compare metrics
    # 5. Generate report
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Placeholder report
    report = {
        "prompt_a": args.prompt_a,
        "prompt_b": args.prompt_b,
        "eval_set": args.eval_set,
        "status": "template_only",
        "note": "Full implementation pending"
    }
    
    with open(output_dir / "comparison.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"✅ Report template at {output_dir}/comparison.json")

if __name__ == "__main__":
    main()
```

---

### Epic 7: Prompt Governance

**Goal:** Prompt changes require evidence and are reversible.

#### Story 7.1 — PR Template for Prompt Changes

**Acceptance Criteria:**
- [ ] PR template enforces A/B report requirement
- [ ] Prompt SHA before/after tracked

**Files to create:**
- `.github/pull_request_template.md`

**Implementation:**

```markdown
## Prompt Change Checklist

**⚠️ Required for all prompt/rules/guardrails changes:**

- [ ] **A/B Test Completed** (attach report link or artifact)
- [ ] **Prompt SHA (before):** _____
- [ ] **Prompt SHA (after):** _____
- [ ] **Expected Effect:** (e.g., "Improve DE LIX by ~5 points without dropping meaning")
- [ ] **Eval Set Used:** (e.g., `eval_set/v1.jsonl`)
- [ ] **Regressions Checked:** No unexpected negative impacts

## Changes Summary

<!-- Describe what changed in prompts/rules/guardrails -->

## A/B Test Results

<!-- Paste summary or link to report -->

**Median Metrics Comparison:**
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| LIX/HIX | | | |
| Avg Sentence Length | | | |
| Guardrail Failures | | | |

## Rollback Plan

<!-- How to revert if this causes issues -->
```

---

### Epic 8: API Integration

**Goal:** Reuse the same modules in FastAPI endpoint.

#### Story 8.1 — Add Scorer/Logger to FastAPI

**Acceptance Criteria:**
- [ ] `/v1/log-run` endpoint uses same RunRecord schema
- [ ] `/v1/simplify` integrates scoring and logging
- [ ] Behavior identical to Gradio

**Files to modify:**
- `services/api/app/main.py`

**Implementation notes:**

```python
# services/api/app/main.py additions
from lib.models.run_record import RunRecord
from lib.logging.jsonl_logger import JSONLLogger
from lib.scoring.readability import ReadabilityScorer
from lib.guardrails.evaluator import GuardrailEvaluator

# Initialize shared components
logger = JSONLLogger(log_dir="./logs")
scorer = ReadabilityScorer()
evaluator = GuardrailEvaluator("guardrails/v1.yaml")

@app.post("/v1/log-run")
def log_run(record: RunRecord):
    """Central logging endpoint for all surfaces."""
    logger.log(record.dict())
    return {"status": "logged", "run_id": record.run_id}

@app.post("/v1/simplify")
def simplify(req: SimplifyRequest):
    """Simplify with integrated scoring and logging."""
    # ... existing simplification logic ...
    
    # Score
    scores = scorer.score(output, lang=req.target_lang)
    
    # Evaluate guardrails
    guardrails = evaluator.evaluate(scores.metrics, req.target_lang)
    
    # Build and log run record
    # (See full implementation in Story 4.2)
    
    return {
        "simplified_text": output,
        "scores": scores.metrics,
        "guardrails": {
            "passed": guardrails.passed,
            "violations": [v.__dict__ for v in guardrails.violations]
        }
    }
```

---

## 4. Technical Details

### 4.1 Metric Computation

#### Readability Metrics

```python
def compute_readability(text: str, lang: str = "en") -> dict:
    """
    Compute readability metrics for text.
    
    Returns:
        dict with: sentence_count, word_count, avg_sentence_len_words,
                   pct_sentences_gt20, avg_word_len_chars, pct_words_gt6, lix
    """
```

**LIX Formula:**
```
LIX = (words / sentences) + (long_words × 100 / words)

Where:
- long_words = words with > 6 characters

Interpretation:
- < 30: Very easy (children's books)
- 30-40: Easy (fiction)
- 40-50: Medium (newspapers)
- 50-60: Difficult (academic)
- > 60: Very difficult (technical)
```

#### Semantic Focus Metrics

Based on TF-IDF + NMF topic modeling:

```python
def compute_semantic_metrics(text: str, topic_model: TopicModelBundle) -> dict:
    """
    Compute semantic focus metrics from topic distribution.
    
    Returns:
        dict with: n_topics, semantic_richness, semantic_clarity, 
                   semantic_noise, n_eff, topic_pmax
    """
```

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| n_topics | Count of p_i ≥ τ | Number of "active" topics |
| semantic_richness | Σ p_i × rank_i | Higher = more diverse topics |
| semantic_clarity | (1/n) × Σ(pmax - p_i) | Higher = one dominant topic |
| n_eff | exp(entropy) | Effective number of topics |

#### Meaning Preservation

```python
def compute_meaning_similarity(source: str, output: str) -> float:
    """
    Compute semantic similarity between source and simplified text.
    
    Uses sentence-transformers if available, falls back to TF-IDF.
    
    Returns:
        float: Cosine similarity (0.0 to 1.0)
    """
```

**Recommended Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

**⚠️ Important:** This is an **evaluation model only** — it does NOT replace your LLM (llama-3.1-8b-instant).

**What it does:**
- Measures semantic similarity between source and simplified text (meaning preservation score)
- Computes embeddings and cosine similarity (0.0 to 1.0)
- Runs **separately** from text generation, in batch processing only

**When it's used:**
- ❌ NOT during real-time simplification (user requests)
- ✅ ONLY in batch evaluator (`tools/batch_eval.py`) — processes logged runs overnight/periodically
- ✅ Used for A/B testing reports and outlier analysis

**Why this model:**
- Multilingual (German + English) in unified embedding space
- Fast inference (~500ms per text pair, acceptable for batch)
- Optimized for paraphrase detection (exactly our use case)
- Good quality for short texts (sentences/paragraphs)

**Implementation timeline:**
- Week 2-3: Skip this — focus on readability metrics
- Week 3-4: Add to batch evaluator (see Section 7.2 for metrics timing strategy)

### 4.2 Guardrail Derivation

Thresholds are derived from the Easy Language calibration corpus:

```python
def derive_guardrails(easy_corpus: List[str], percentile: float = 80.0) -> dict:
    """
    Derive guardrail thresholds from Easy Language corpus.
    
    For "lower is better" metrics: threshold = percentile(80)
    For "higher is better" metrics: threshold = percentile(20)
    
    This means: if your output is worse than 80% of Easy Language samples,
    the guardrail fails.
    """
```

### 4.3 Language Support

| Language | Sentence Splitting | Entity Extraction | Topic Model |
|----------|-------------------|-------------------|-------------|
| English | Regex + abbrev handling | spaCy (en_core_web_sm) | TF-IDF + NMF |
| German | Regex + DE abbrevs | spaCy (de_core_news_sm) | TF-IDF + NMF |

---

## 5. Integration Points

### 5.1 Demo App Integration

```python
# demo/app.py

from lib.scoring import Scorer, format_feedback

scorer = Scorer(config="config/guardrails.yaml")

def simplify_text(text: str, target_lang: str, api_key: str) -> tuple[str, str]:
    # ... LLM call ...
    output = response.choices[0].message.content
    
    # Score and generate feedback
    scores = scorer.score(source=text, output=output, lang=target_lang)
    feedback = format_feedback(scores, format="markdown")
    
    return output, feedback
```

### 5.2 Batch Evaluation Integration

```python
# scripts/evaluate_batch.py

from lib.scoring import Scorer, BatchLogger

scorer = Scorer()
logger = BatchLogger("outputs/runs/experiment_001.jsonl")

for item in benchmark:
    output = model.generate(item["source_text"])
    scores = scorer.score(item["source_text"], output)
    logger.log(item, output, scores)

logger.save_summary("outputs/reports/experiment_001_summary.csv")
```

### 5.3 API Integration

#### Logging Endpoint: `POST /v1/log-run`

The API now includes a dedicated endpoint for collecting performance data:

```python
# services/api/app/main.py

@app.post("/v1/log-run")
def log_run(req: LogRunRequest) -> LogRunResponse:
    """
    Log performance data for a simplification run to enable feedback loop.
    
    Collects:
    - Metadata (run ID, timestamp, model, parameters)
    - Performance metrics (latency, chunk count)
    - Quality scores (LIX, sentence length, etc.)
    - Warnings and edge cases
    - Optional user feedback
    
    Privacy: No raw text stored, only SHA256 hash
    """
```

**Request Model:**
```python
class LogRunRequest(BaseModel):
    run_id: str                    # UUID for this run
    input_hash: str                # SHA256 hash of input (privacy)
    input_length: int              # Character count
    target_lang: str               # de | en
    level: str                     # very_easy | easy | medium
    model_used: str                # e.g., "llama-3.1-8b-instant"
    output_length: int             # Character count
    latency_ms: int                # Processing time
    chunk_count: Optional[int]     # Number of chunks (default: 1)
    scores: Optional[dict]         # Quality metrics
    warnings: Optional[list[str]]  # Any warnings
    user_feedback: Optional[str]   # thumbs_up | thumbs_down | flag
    timestamp: Optional[str]       # ISO 8601 (auto-generated if not provided)
```

**Example Usage:**
```python
import hashlib
import time
import uuid
import requests

# Before simplification
start_time = time.time()
input_hash = hashlib.sha256(text.encode()).hexdigest()

# ... perform simplification ...

# After simplification
latency_ms = int((time.time() - start_time) * 1000)

# Compute quality scores (from lib.scoring)
scores = scorer.score(text, simplified_text, target_lang)

# Log the run
requests.post("http://api.klartext.com/v1/log-run", json={
    "run_id": str(uuid.uuid4()),
    "input_hash": input_hash,
    "input_length": len(text),
    "target_lang": "de",
    "level": "easy",
    "model_used": "llama-3.1-8b-instant",
    "output_length": len(simplified_text),
    "latency_ms": latency_ms,
    "scores": {
        "lix": scores["lix"],
        "avg_sentence_len": scores["avg_sentence_len"],
        "pct_long_sentences": scores["pct_long_sentences"]
    },
    "warnings": scores.get("warnings", [])
})
```

#### Simplification Endpoint Integration

```python
# services/api/app/main.py

from lib.scoring import Scorer

@app.post("/v1/simplify")
def simplify(req: SimplifyRequest) -> SimplifyResponse:
    output = simplify_with_llm(req.text, req.level, req.target_lang)
    scores = scorer.score(req.text, output, req.target_lang)
    
    return SimplifyResponse(
        simplified_text=output,
        scores=scores,
        guardrails_passed=scores["guardrails_passed"],
        warnings=scores.get("warnings", [])
    )
```

**Storage Options:**
- **MVP:** JSON Lines (JSONL) append-only file at `data/run_logs.jsonl`
- **Production:** PostgreSQL table with indexed queries
- **Analytics:** Export to data warehouse for trend analysis

See `docs/api_design.md` for complete endpoint documentation.

---

## 6. Success Criteria

### Week 2 Complete When (Foundation):
- [ ] **Run schema implemented** - `RunRecord` model with all required fields
- [ ] **Asset versioning working** - SHA256 refs for prompts/rules/guardrails
- [ ] **Scoring extracted to `lib/scoring/`** - Readability module with tests
- [ ] **Guardrails YAML config** - Language-aware thresholds with precedence rules
- [ ] **JSONL logger implemented** - Thread-safe, rotates by date
- [ ] **Gradio integrated** - 100% of runs logged (including errors)
- [ ] **Privacy decision made** - Hash-only vs full-text-with-toggle chosen (see Section 10.1)

### Week 3 Complete When (Analysis):
- [ ] **Batch evaluator working** - Can recompute metrics on logs
- [ ] **Outlier reports generated** - `summary.json` + `report.md` + optional CSV
- [ ] **A/B harness implemented** - Can compare two prompt versions quantitatively
- [ ] **Eval set created** - 30-100 samples, versioned, with edge cases
- [ ] **Metrics timing decision made** - Real-time vs batch strategy documented (see Section 10.2)
- [ ] **First A/B test completed** - Validated the workflow end-to-end

### Week 4 Complete When (Integration):
- [x] **API `/v1/log-run` endpoint** - Implemented and documented
- [ ] **API logging integrated** - Both Gradio and API use central logger
- [ ] **Prompt governance established** - PR template requires A/B reports
- [ ] **Semantic/meaning metrics added** - Implemented in batch evaluator (optional)
- [ ] **Full feedback loop validated** - Can prove "prompt v2 improved DE LIX by X without dropping meaning below Y"

### MVP Success Metrics:
- ✅ Every simplification produces a logged run with full traceability (SHA refs)
- ✅ Can generate "worth mentioning" report in <5 minutes
- ✅ Can run A/B test between prompt versions in <30 minutes
- ✅ Prompt changes are governed (require evidence, no silent regressions)
- ✅ No manual log reading needed (automated reports handle it)
- ✅ Team can answer: "Did this change improve quality?" with data

---

## 7. Open Decisions & Design Choices

### 7.1 Privacy Approach (⏳ DECISION NEEDED)

**Context:** The proposal and breakdown differ on how to handle user text in logs. This decision impacts GDPR compliance, debugging capability, and storage size.

#### Option A: Hash Only (Original Proposal)

**Storage:**
- Store SHA256 hash of input/output text
- Store length, language, metrics only
- No raw text in logs

**Pros:**
- ✅ GDPR/privacy compliant by design
- ✅ Safe for public-facing demo
- ✅ No risk of logging sensitive data
- ✅ Smaller log files

**Cons:**
- ❌ Cannot reproduce scoring exactly later
- ❌ Cannot debug "why did this fail" without context
- ❌ Cannot use for human evaluation of quality

**Implementation:**
```python
class RunRecord(BaseModel):
    input_hash: str = Field(..., description="SHA256(input_text)")
    output_hash: str = Field(..., description="SHA256(output_text)")
    input_length: int
    output_length: int
    # No input_text or output_text fields
```

---

#### Option B: Full Text with Toggles (Breakdown Recommendation)

**Storage:**
- Store full input/output text
- Add privacy controls:
  - Disable logging for public users by default
  - Enable only for authenticated team sessions
  - OR log only eval-set runs (not arbitrary user input)

**Pros:**
- ✅ Can reproduce exact scoring later
- ✅ Can debug failures with full context
- ✅ Can use for human quality evaluation
- ✅ Enables deeper analysis and outlier inspection

**Cons:**
- ❌ Must implement privacy toggles correctly
- ❌ Risk of accidentally logging sensitive data
- ❌ Larger log files
- ❌ GDPR considerations for public demo

**Implementation:**
```python
class RunRecord(BaseModel):
    input_text: str  # Full text
    output_text: str  # Full text
    is_public_user: bool = False  # Flag for privacy
    # ... other fields

# In logging code:
if os.getenv("KLT_TEAM_MODE") == "true" or is_eval_set:
    record.input_text = text
    record.output_text = output
else:
    # Public mode: hash only
    record.input_text = hashlib.sha256(text.encode()).hexdigest()
    record.output_text = hashlib.sha256(output.encode()).hexdigest()
```

---

#### Option C: Hybrid Approach (Recommended for MVP)

**Storage:**
- Store hashes by default
- Store full text only for:
  - Eval set runs (flagged with `source="eval_set"`)
  - Authenticated team sessions
  - Explicit opt-in by user

**Pros:**
- ✅ Privacy-safe by default
- ✅ Full text available for controlled cases
- ✅ Best of both worlds
- ✅ Can transition smoothly from MVP to production

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Must maintain consistency across surfaces

**Implementation:**
```python
class RunRecord(BaseModel):
    # Always present
    input_hash: str
    output_hash: str
    
    # Optional (only if source="eval_set" or team mode)
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    
    source: str  # "eval_set" | "team" | "public"
```

---

#### **Recommendation:**

**For Week 2 MVP:** Use **Option A (Hash Only)** for simplicity and safety.
- Implement full SHA256 hashing
- Store length and metadata
- Safe for public demo
- Avoids privacy complications

**For Week 3+:** Migrate to **Option C (Hybrid)** once you have:
- Eval set established and flagged
- Team authentication in place
- Privacy toggle tested and verified

**Decision Required By:** End of Week 2 (before API integration)

**Action Items:**
1. Review with team and legal (if applicable)
2. Document chosen approach in this section
3. Update `RunRecord` model accordingly
4. Add privacy notice to demo UI if storing full text

---

### 7.2 Metrics Timing Strategy (⏳ DECISION NEEDED)

**Context:** Should all metrics be computed real-time, or defer heavy ones to batch? This impacts user experience, latency, and architecture.

#### Option A: All Metrics Real-Time (Original Proposal)

**Approach:**
- Compute readability, semantic, entity, meaning, linguistic metrics on every request
- Display all in UI immediately
- Single code path (no batch/real-time split)

**Pros:**
- ✅ Complete feedback immediately
- ✅ Single code path (simpler architecture)
- ✅ No need for batch processing infrastructure

**Cons:**
- ❌ Latency impact (especially embeddings: ~500-1000ms)
- ❌ Requires loading heavy models (sentence-transformers: ~400MB)
- ❌ Slower demo experience
- ❌ Higher memory usage

**Estimated latency per request:**
- Readability: ~50ms
- Semantic (topic modeling): ~200ms
- Meaning (embeddings): ~500-1000ms
- **Total: ~1-1.5 seconds added** (on top of LLM call)

---

#### Option B: Thin Slice Real-Time, Heavy Batch (Breakdown Recommendation)

**Approach:**
- **Real-time (in Gradio/API):**
  - Readability metrics (LIX, sentence length, word length)
  - Simple structural checks (bullets, headings)
  - Basic heuristics (numbers, dates preservation)
  
- **Batch (nightly/periodic):**
  - Embeddings similarity (meaning preservation)
  - Topic modeling (semantic metrics)
  - NER entity extraction
  - Linguistic rates (passive voice, negation)

**Pros:**
- ✅ Fast demo experience (<100ms overhead)
- ✅ Still get immediate readability feedback (80% of value)
- ✅ Heavy analysis available for reports/A/B tests
- ✅ Can optimize batch processing separately

**Cons:**
- ❌ Meaning preservation not shown immediately
- ❌ Need to maintain two code paths
- ❌ Batch reports delayed until processing runs

**Latency:**
- Real-time: ~50-100ms (acceptable)
- Batch: Minutes/hours (doesn't matter for user experience)

---

#### **Recommendation:**

**For Week 2-3 MVP:** Use **Option B (Thin Slice)**

**Reasoning:**
1. **User experience is critical** - Slow demos feel broken
2. **Readability metrics provide 80% of value** immediately
3. **Meaning preservation is more important for:**
   - Batch evaluation and trend analysis
   - A/B testing comparisons
   - Outlier reports and debugging
4. **Can always add expensive metrics to real-time later** if needed

**Implementation Strategy:**
```python
# Real-time scoring (fast)
def score_realtime(text: str, lang: str) -> dict:
    """Fast metrics only - <100ms target"""
    scorer = ReadabilityScorer()
    return scorer.score(text, lang)

# Batch scoring (comprehensive)
def score_batch(record: dict) -> dict:
    """Add expensive metrics - can take seconds per record"""
    from lib.scoring.meaning import MeaningScorer
    from lib.scoring.semantic import SemanticScorer
    
    meaning_scorer = MeaningScorer()
    semantic_scorer = SemanticScorer()
    
    return {
        "meaning_similarity": meaning_scorer.score(
            record["input_text"], 
            record["output_text"],
            record["lang"]
        ),
        "semantic_metrics": semantic_scorer.score(
            record["output_text"],
            record["lang"]
        )
    }
```

**Decision Required By:** End of Week 2 (before implementing Phase 2 metrics expansion)

**Action Items:**
1. Test latency of readability scoring in Gradio
2. Measure impact of adding each metric type
3. Document threshold (e.g., "keep real-time metrics under 150ms")
4. Plan batch evaluator implementation for Week 3

---

### 7.3 Endpoint Naming (✅ DECIDED)

**Decision:** Use `/v1/log-run` as currently implemented in `services/api/app/main.py`

**Rationale:**
- Already exists in codebase and documented
- Follows semantic versioning in URL path (`/v1/`)
- Clear purpose from name
- Industry standard pattern (Stripe, GitHub, OpenAI)
- No need to change and break existing code

**Status:** ✅ Confirmed - no action needed

---

### 7.4 Additional Open Questions

These remain from the original proposal and should be addressed as we progress:

1. **Threshold Calibration:** Should guardrails be stricter for "Leichte Sprache" (certified Easy Language) vs. general simplification?
   - *Recommendation:* Start with single set, add category overrides in `guardrails/v1.yaml` if needed

2. **Multi-language Topic Models:** Should we train separate topic models for German and English, or use a multilingual approach?
   - *Recommendation:* Defer to batch metrics phase (Week 3-4)

3. **User Feedback Loop:** The `/v1/log-run` endpoint supports optional `user_feedback` field. Should we add thumbs up/down UI?
   - *Recommendation:* Add in Week 3 after basic logging is working

4. **Metric Dashboard:** Should we create a dashboard for visualizations?
   - *Recommendation:* No - use markdown reports until you have 200-500 runs (see Section 8 Anti-Patterns)

---

## 8. Anti-Patterns to Avoid

Based on the detailed implementation breakdown, these are explicitly called out as things **NOT to do**. These anti-patterns have caused failures in similar projects.

### 8.1 Premature Dashboard Building

**Don't:** Build dashboards before you have ~200-500 runs worth of data

**Why:** 
- Early charts are noise and bikeshedding
- You'll spend time on tooling instead of collecting signal
- Dashboards optimize for the wrong metrics before you understand the problem

**Instead:** 
- Use markdown reports (`report.md`) for human consumption
- Use JSON summaries (`summary.json`) for machine consumption  
- Optional CSV exports for ad-hoc analysis
- Wait until patterns emerge before investing in visualization

**How to tell you're ready for dashboards:**
- You have consistent data for 2+ weeks
- You've identified 3-5 key metrics that actually matter
- Manual reports feel repetitive and slow

---

### 8.2 CSV as Source of Truth

**Don't:** Store run data primarily in CSV format

**Why CSV fails quickly:**
- Nested fields don't fit (triggered rules, multiple issues, metric dicts)
- Text fields are fragile (newlines, commas, quoting nightmares)
- Schema changes break all consumers
- Hard to join (one run → many issues is painful in CSV)
- Can't store complex types without JSON-in-cells hacks

**Instead:**
- **Source of truth:** JSONL (one record per line, append-only)
- **Analysis-friendly:** Parquet (columnar, fast, handles nested data)
- **Human-readable:** Markdown reports
- **Optional export:** CSV for flat metrics table only (derived, not primary)

**Example of good architecture:**
```
Raw logs → runs_2026-01-12.jsonl (source of truth)
    ↓
Batch eval → eval_2026-01-12.jsonl (enriched with heavy metrics)
    ↓
Reports → summary.json + report.md (worth mentioning only)
    ↓
Optional → metrics.csv (flat table for Excel users)
```

---

### 8.3 Self-Updating Prompts

**Don't:** Let the system modify prompts automatically in production

**Why this is dangerous:**
- Silent regressions with no attribution
- No rollback capability ("what did it change?")
- Breaks reproducibility (logs reference prompt SHA that keeps changing)
- Optimization loops can drift into local minima
- Loses human judgment and domain expertise

**Instead:**
- **Suggestion mode:** System proposes changes as diffs
- **Human approval:** Changes go through PR review
- **A/B validation:** Required A/B test showing improvement
- **Gradual rollout:** Test on eval set before production
- **Clear attribution:** "This change improved X by Y on date Z"

**Acceptable automation:**
- Automatic outlier detection and reporting
- Automatic A/B test execution
- Automatic suggestion generation (but not application)

---

### 8.4 Complex Bucket Storage Systems

**Don't:** Build "bucket storage" infrastructure for organizing runs

**Why it's premature:**
- Buckets are a **view**, not a storage model
- You don't yet know the right dimensions (lang? category? length? model?)
- Adds complexity without solving actual problems
- Makes queries harder, not easier

**Instead:**
- Store raw runs with metadata fields:
  - `lang` (en, de)
  - `category` (unknown, legal, medical, etc.)
  - `input_length_bucket` (short, medium, long)
  - `prompt_ref` (SHA)
  - etc.
- Filter at **query time**: "Show me all DE legal texts that failed"
- Let analysis tools create virtual buckets as needed

**Example:**
```python
# Bad: Pre-bucketing
logs/
├── de/
│   ├── legal/
│   │   └── long/
│   │       └── runs.jsonl  # Painful directory structure

# Good: Flat with metadata
logs/
└── runs_2026-01-12.jsonl  # All runs with filterable metadata
```

---

### 8.5 Losing Experiment Context

**Don't:** Log runs without prompt/rules/guardrails version references

**Why this kills learning:**
- "We tuned prompts for weeks and can't prove anything improved"
- "Which version of the guardrails caught this?"
- "What was the prompt when this worked well?"
- No rollback capability
- Can't reproduce results

**Instead:**
- **Every run MUST include:**
  - `prompt_ref: "prompts/en/v1/system.md:sha256:abc123..."`
  - `ruleset_ref: "rulesets/v1.yaml:sha256:def456..."`
  - `guardrails_ref: "guardrails/v1.yaml:sha256:ghi789..."`
- **SHA256 is the real truth** (version is for humans)
- **Asset registry** computes SHAs automatically
- **No exceptions** - even dev/test runs need refs

**This enables:**
- Provable improvements ("SHA abc improved LIX by 5 points")
- Confident rollback ("Revert to SHA xyz")
- Reproducible experiments
- Fair A/B comparisons

---

### 8.6 Ignoring Privacy Early

**Don't:** Log everything and worry about privacy later

**Why this bites you:**
- GDPR violations can be expensive
- Public demos can collect sensitive data
- Hard to retroactively delete logged data
- Trust issues with users

**Instead:**
- **Decide privacy approach NOW** (see Section 7.1)
- **Default to safe:** Hash-only for public users
- **Team toggle:** Full text only for authenticated sessions
- **Clear notice:** Tell users what you're logging
- **Regular review:** Audit logs for sensitive data

**Minimum acceptable:**
```python
# Check before logging full text
if is_public_user():
    record.input_text = hash(text)  # Safe
else:
    record.input_text = text  # Full text for team only
```

---

### 8.7 Building Features Without Validation

**Don't:** Build the full vision before validating the basics

**Why this wastes time:**
- You build features nobody needs
- Core functionality stays unvalidated
- Complexity compounds before learning
- Hard to pivot

**Instead:**
- **Week 2:** Validate run schema + logging works
- **Week 3:** Validate reports are useful
- **Week 4:** Validate A/B testing answers real questions
- **Then expand:** Add features based on validated needs

**Red flags:**
- "Let's add a feature for X even though we haven't used Y yet"
- "We need this for the future" (without concrete use case)
- "It would be cool if..." (without validating current features)

---

## 9. References

### Internal Documentation
- `notebooks/05_easy_language_evaluation.ipynb` - Full metric framework
- `notebooks/04_hix_evaluation_test.ipynb` - HIX scoring methodology
- `demo/app.py` - Current scoring implementation
- `services/api/app/main.py` - API implementation with `/v1/log-run` endpoint
- **`docs/api_design.md`** - Complete API documentation including logging endpoint
- `docs/phase_0_testing_guide.md` - Step-by-step guide for API integration

### Planning Documents
- **`docs/KlarText project status and next steps copy.txt`** - Detailed implementation breakdown with epics and tickets
- **Implementation guidance:** Week-by-week priorities, anti-patterns to avoid, storage strategy
- **Privacy considerations:** Hash-only vs full-text trade-offs (see Section 7.1)
- **Metrics timing:** Real-time vs batch strategy (see Section 7.2)
- **Storage architecture:** JSONL + JSON reports + optional CSV exports (see Section 8.2)
- **A/B testing workflow:** Eval set creation, comparison reports, PR requirements

### API Documentation
- **`POST /v1/log-run`** - Performance data collection endpoint (see Section 5.3)
- **Swagger UI:** `http://localhost:8000/docs` - Interactive API documentation
- **OpenAPI Spec:** `http://localhost:8000/openapi.json` - Machine-readable API specification

### Implementation Code Structure
```
lib/
├── models/          # RunRecord schema (Epic 1.1)
├── versioning/      # Asset registry with SHA refs (Epic 1.2)
├── scoring/         # Readability, semantic, meaning scorers (Epic 2)
├── guardrails/      # YAML config + evaluator (Epic 3)
└── logging/         # JSONL logger (Epic 4)

tools/
├── batch_eval.py         # Batch evaluator (Epic 5.1)
├── report_outliers.py    # Outlier reports (Epic 5.2)
└── ab_runner.py          # A/B testing (Epic 6.2)

eval_set/
└── v1.jsonl             # Versioned test set (Epic 6.1)

guardrails/
└── v1.yaml              # Threshold configuration (Epic 3)
```

### External Resources
- [LIX Readability Index](https://en.wikipedia.org/wiki/LIX) - Swedish readability formula
- [Leichte Sprache Rules](https://www.leichte-sprache.org/leichte-sprache/) - German Easy Language standards
- [Plain Language Guidelines](https://www.plainlanguage.gov/guidelines/) - US Federal plain language guidelines

---

## Appendix A: Current Demo Scoring Code

```python
# Current implementation in demo/app.py (simplified)

def compute_simple_scores(text: str) -> dict:
    sentences = split_sentences_for_scoring(text)
    words = get_words_for_scoring(text)
    
    # Sentence lengths
    sent_lengths = [len(get_words_for_scoring(s)) for s in sentences]
    avg_sent_len = sum(sent_lengths) / len(sentences)
    pct_long = sum(1 for l in sent_lengths if l > 20) / len(sentences) * 100
    
    # LIX score
    long_words = sum(1 for w in words if len(w) > 6)
    lix = (len(words) / len(sentences)) + (long_words * 100.0 / len(words))
    
    # Pass/fail checks
    checks = {
        "sentence_length": avg_sent_len <= 15,
        "long_sentences": pct_long <= 10,
        "lix_score": lix <= 40,
    }
    
    return {
        "avg_sentence_len": avg_sent_len,
        "pct_long_sentences": pct_long,
        "lix": lix,
        "checks_passed": sum(checks.values()),
        "checks_total": len(checks),
    }
```

---

## Appendix B: Proposed Scorer Interface

```python
# lib/scoring/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class ScoreResult:
    """Result from a single metric scorer."""
    name: str
    value: float
    threshold: Optional[float] = None
    passed: Optional[bool] = None
    message: Optional[str] = None

class BaseScorer(ABC):
    """Base class for metric scorers."""
    
    @abstractmethod
    def score(self, text: str, **kwargs) -> Dict[str, ScoreResult]:
        """Compute metrics for text."""
        pass

class CompositeScorer:
    """Combines multiple scorers into one."""
    
    def __init__(self, scorers: list[BaseScorer], guardrails: dict):
        self.scorers = scorers
        self.guardrails = guardrails
    
    def score(self, source: str, output: str, lang: str = "en") -> Dict[str, Any]:
        """Run all scorers and evaluate guardrails."""
        results = {}
        for scorer in self.scorers:
            results.update(scorer.score(output, source=source, lang=lang))
        
        # Evaluate guardrails
        passed = 0
        failed = []
        for metric, config in self.guardrails.items():
            if metric in results:
                ok = self._check_threshold(results[metric].value, config)
                if ok:
                    passed += 1
                else:
                    failed.append(metric)
        
        return {
            "metrics": results,
            "guardrails_passed": passed,
            "guardrails_total": len(self.guardrails),
            "guardrails_failed": failed,
        }
```

---

## Document History

**Version 2.0** - January 12, 2026
- ✅ Added detailed implementation breakdown (Epics 1-8 with acceptance criteria)
- ✅ Added open decisions section (privacy approach, metrics timing)
- ✅ Added anti-patterns to avoid (based on common project failures)
- ✅ Updated success criteria with week-by-week breakdown
- ✅ Confirmed endpoint naming decision: `/v1/log-run`
- ✅ Integrated guidance from implementation breakdown document
- 📄 Document now ~2,200 lines (from 783) - comprehensive implementation guide

**Version 1.0** - January 8, 2026
- Initial proposal with architecture, phases, and integration points
- `/v1/log-run` endpoint implemented
- Basic success criteria defined

---

*Last Updated: January 12, 2026*  
*Status: Active - Week 2 implementation in progress*
