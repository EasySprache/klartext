# Scoring & Feedback Pipeline Proposal

**Status:** Draft Proposal  
**Date:** January 8, 2026  
**Author:** KlarText Team

---

## Executive Summary

This document outlines a proposal for integrating automated quality scoring into the KlarText text simplification pipeline. The goal is to provide immediate, actionable feedback on simplified text quality—enabling iterative improvement of prompts, benchmarks, and guardrails.

**Key Benefits:**
- Real-time quality feedback during testing
- Data-driven prompt optimization
- Automated guardrail enforcement
- Foundation for A/B testing different simplification approaches

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
| **llama-3.1-8b-instant** | **37.3** ✅ | 12.0 words | 5.0% | 0.25s | Best LIX, good structure with bullet points |
| llama-3.3-70b-versatile | 40.9 | 10.0 words | 0.0% | 0.21s | Very short outputs, may lose information |
| qwen3-32b | 37.5 | 8.7 words | 3.6% | 0.96s | Includes reasoning tags, good LIX |

**Target:** LIX < 40, Avg Sentence Length < 15 words, Long Sentences < 10%

**Why llama-3.1-8b-instant?**
- ✅ **Best LIX score** (37.3) - lowest complexity
- ✅ **Better structure** - uses bullet points and clear formatting
- ✅ **Fast inference** - 0.25s average latency
- ✅ **Good balance** - maintains meaning while simplifying
- ✅ **Consistent output** - reliable formatting without extra metadata

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
- German (combined): `prompts/templates/simplify_de_fewshot.txt` (to be split in future iteration)

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

### Phase 1: Extract & Modularize (Current → Week 1)
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

### Phase 2: Expand Metrics (Week 2)
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

### Phase 3: Guardrails & Feedback (Week 3)
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

### Phase 4: Logging & Analysis (Week 4)
**Goal:** Enable systematic data collection for analysis

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add JSONL logging to demo | 2h | Phase 3 |
| Create analysis notebook | 3h | Logging |
| Dashboard for metric trends | 4h | Analysis |
| A/B test framework for prompts | 4h | Logging |

**Deliverables:**
- Automatic logging of all simplifications
- Analysis notebook for prompt comparison
- Optional: Streamlit/Gradio dashboard for trends

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
- Multilingual (German + English)
- Fast inference
- Good quality for short texts

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

### 5.3 API Integration (Future)

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

---

## 6. Success Criteria

### Phase 1 Complete When:
- [ ] Scoring extracted to `lib/scoring/`
- [ ] Demo uses modular scorer
- [ ] Unit tests pass for readability metrics

### Phase 2 Complete When:
- [ ] All metrics from notebook available in module
- [ ] Optional dependencies handled gracefully
- [ ] Integration tests pass

### Phase 3 Complete When:
- [ ] Guardrails configurable via YAML
- [ ] Demo shows full metric table
- [ ] Thresholds derived from corpus

### Phase 4 Complete When:
- [ ] All simplifications logged to JSONL
- [ ] Analysis notebook can compare prompts
- [ ] Clear winner/loser identification

---

## 7. Open Questions

1. **Threshold Calibration:** Should guardrails be stricter for "Leichte Sprache" (certified Easy Language) vs. general simplification?

2. **Multi-language Topic Models:** Should we train separate topic models for German and English, or use a multilingual approach?

3. **Real-time vs. Batch:** Should heavy metrics (embeddings, topic models) be computed real-time in demo, or only in batch evaluation?

4. **User Feedback Loop:** Should we capture user ratings (thumbs up/down) to correlate with automated scores? Should we include RAG for evaluations? 

5. **Prompt A/B Testing:** How do we structure experiments to compare prompt variants systematically?

6. **Metric Dashboard** Should we create a dashboard for visualizations on performance and scoring over time?

---

## 8. References

### Internal
- `notebooks/05_easy_language_evaluation.ipynb` - Full metric framework
- `notebooks/04_hix_evaluation_test.ipynb` - HIX scoring methodology
- `demo/app.py` - Current scoring implementation

### External
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

*Document Version: 1.0*  
*Last Updated: January 8, 2026*
