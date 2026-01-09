# Baseline Model Findings

## Overview
This document records the baseline evaluation of LLM prompts and models for the text simplification task at the end of Sprint 1. The goal was to select a performant model and prompt strategy for the web application prototype.

## Models evaluated
The following models were evaluated using the Groq API:
- `llama-3.1-8b-instant` (Referred to as Model A or Baseline)
- `llama-3.3-70b-versatile` (Referred to as Model B in scoring notebooks)

`llama-3.1-8b-instant` was selected for the final application (`demo/app.py`).

## Texts / statements used for evaluation
Evaluation relied on a fixed set of English sample texts representing common complexity domains. These are stored in `data/samples/`:

- **Academic**: `en_academic.txt`
- **Government**: `en_government.txt`
- **Insurance**: `en_insurance.txt`
- **Legal**: `en_legal.txt`
- **Literature**: `en_literature.txt`
- **Medical**: `en_medical.txt`
- **Technical**: `en_technical.txt`

## Evaluation methods
Two primary evaluation methods were employed, tied to specific notebooks:

1.  **Rule-Based Scoring** (`prompts/03_prompt_scoring.ipynb`, `notebooks/07_model_scoring.ipynb`)
    -   Tests outputs against a set of "Easy Language" rules using regular expressions and heuristics.
    -   Checks for structural compliance (bullet points, paragraphs) and constraints (negative constraints like "no introductory text").

2.  **LLM-as-Judge** (`prompts/02_final_prompt_evaluation.ipynb`)
    -   Uses `llama-3.1-8b-instant` to evaluate the semantic similarity between the original statements and the simplified output.
    -   Focuses on meaning preservation despite paraphrasing.

## Performance metrics

### Rule-Based Metrics
Implemented in `notebooks/07_model_scoring.ipynb` and `prompts/03_prompt_scoring.ipynb`:

| Metric | What it measures | Output Format |
| :--- | :--- | :--- |
| **Short Sentences** | Percentage of sentences exceeding 10 words. | Pass if ≤ 15% |
| **Uses Bullet Points** | Presence of bullet points or numbered lists. | Boolean / Pass/Fail |
| **Clear Paragraphs** | Presence of blank lines between sections. | Boolean / Pass/Fail |
| **No Intro/Outro** | Absence of conversational filler (e.g., "Here is..."). | Boolean / Pass/Fail |
| **No XML/Tags** | Absence of XML/HTML artifacts. | Boolean / Pass/Fail |
| **Active Voice** | Low frequency of passive voice markers ("is", "are", etc.). | Pass if count < 5 |
| **Keep Meaning (TF-IDF)** | Cosine similarity of TF-IDF vectors (Original vs Output). | Pass if similarity ≥ 0.3 |

### LLM-as-Judge Metrics
Implemented in `prompts/02_final_prompt_evaluation.ipynb`:

| Metric | What it measures | Scale |
| :--- | :--- | :--- |
| **Semantic Similarity** | Degree to which key information and meaning is preserved. | Float (0.0 - 1.0) |

## Baseline results

### Prompt Comparison (Prompt A vs Prompt B)
*Source: prompts/03_prompt_scoring.ipynb, prompts/02_final_prompt_evaluation.ipynb*

- **Prompt A (Baseline)** achieved a higher average Semantic Similarity score (0.9167) than Prompt B (0.9000).
- **Prompt B (Experimental)** demonstrated stricter adherence to formatting rules in some cases but occasionally dropped meaning in complex texts.

### Model Comparison
*Source: notebooks/07_model_scoring.ipynb*

Comparison using **Prompt B** on English samples:

| Sample | Metric | llama-3.1-8b-instant | llama-3.3-70b-versatile |
| :--- | :--- | :--- | :--- |
| **Academic** | Rule Compliance | 5/7 rules | 6/7 rules |
| | Short Sentences (>10w) | 30.0% | 10.0% |
| **Government** | Rule Compliance | 5/7 rules | 6/7 rules |
| | Short Sentences (>10w) | 20.0% | 10.0% |
| **Legal** | Rule Compliance | 6/7 rules | 5/7 rules |
| | Short Sentences (>10w) | 60.0% | 37.5% |
| **Literature** | Rule Compliance | 4/7 rules | 5/7 rules |
| | Short Sentences (>10w) | 37.5% | 0.0% |

**Observation:** The larger model (`llama-3.3-70b-versatile`) consistently performed better on the "Short Sentences" constraint than the 8B model.

## Next steps identified
Follow-up tasks explicitly implied by the notebooks:

-   **German Support**: `demo/app.py` includes placeholder logic for German, but primary evaluation has been on English.
-   **Model Selection**: While 70B performed better on length constraints, 8B was selected for the demo; further optimization of 8B or reconsidering 70B is implied.
-   **Rule Refinement**: The "Keep Meaning" metric (TF-IDF) showed low scores (e.g., 10-19%) even for visibly good simplifications, suggesting the need for a better metric (like the LLM-as-judge used in `02`).
