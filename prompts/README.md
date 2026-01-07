# Prompts Directory

This directory contains prompt templates and evaluation fixtures for the KlarText simplification engine.

## Structure

```
prompts/
├── templates/          # LLM prompt templates
│   ├── simplify_de.txt
│   └── simplify_en.txt
├── eval/               # Evaluation fixtures
│   ├── inputs/         # Sample input texts
│   └── expected/       # Expected outputs for testing
└── README.md
```

## Prompt Guidelines

When writing prompts for text simplification:

1. **Output must be easy to read:**
   - Short sentences
   - Common words
   - Explain technical words if unavoidable
   - Keep structure: headings + bullet points when helpful
   - Do not add new facts

2. **Levels:**
   - `very_easy`: Very short sentences; define anything uncommon; extra whitespace
   - `easy`: Short sentences; clear structure; minimal jargon
   - `medium`: Plain language; normal sentence length; less repetition

3. **Special content:**
   - If input is legal/medical/financial, add a short "not advice" note
   - Preserve meaning; avoid hallucinating facts
   - If something is unclear, say so

## Adding New Prompts

1. Create the template file in `templates/`
2. Add corresponding test cases in `eval/inputs/` and `eval/expected/`
3. Test with the evaluation framework in `notebooks/05_easy_language_evaluation.ipynb`

## Evaluation Framework

The evaluation notebook (`notebooks/05_easy_language_evaluation.ipynb`) provides comprehensive metrics for testing prompts and models.

> **Note:** The current iteration focuses on **English** first. German support will be added once the English pipeline is stable.

### Metrics
- **Readability**: Sentence length, word length, LIX/Flesch-Kincaid index
- **Cognitive Load**: Long-word rate, entity density
- **Semantic Focus**: Topic distribution, clarity, richness
- **Meaning Preservation**: Embedding similarity (source vs. output)

### Key Formulas
| Metric | Formula | Target |
|--------|---------|--------|
| LIX | (W/S) + (LW×100/W) | < 40 |
| % Long Sentences | sentences > 20 words | < 10% |
| Meaning Cosine | cos(emb_src, emb_out) | > 0.7 |

### Usage
1. Add English calibration texts to `data/easy/` and `data/hard/`
2. Run the notebook to derive guardrail thresholds
3. Test prompts against the guardrails

