# Prompt Templates Version 1

**Date:** January 2026  
**Status:** Baseline / Used for benchmarks v1  
**Model:** Groq LLM (llama-3.1-8b-instant)

## Overview

Version 1 represents the original prompt templates used to generate the benchmark dataset (`data/benchmarks/v1/`). These prompts established the baseline performance metrics.

## Files

- `system_prompt_en.txt` - English system prompt (identity, rules, examples)
- `user_prompt_en.txt` - English user prompt template (task instruction)
- `system_prompt_de.txt` - German system prompt
- `user_prompt_de.txt` - German user prompt template

## Characteristics

### English Prompt (system_prompt_en.txt)
- **Length:** ~61 lines
- **Structure:** Few-shot with examples
- **Approach:** 
  - Identity: "You are an expert at making complex text easy to understand"
  - Clear rules about sentence length, vocabulary, structure
  - 2-3 example transformations
  - Emphasis on bullet points and clear formatting

### Performance (from benchmarks/v1/)
Based on 300 real-world web content simplifications:

- **LIX Score:** 37.3 average (target: ≤ 40) ✅
- **Avg Sentence Length:** ~12-15 words (target: ≤ 15) ✅
- **Structure:** Good use of bullet points and formatting
- **Strengths:** 
  - Consistent output format
  - Good readability scores
  - Preserves meaning well
- **Areas for Improvement:**
  - Sometimes over-simplifies short inputs
  - Occasional hallucination of examples
  - Could better preserve technical accuracy

## Usage

These templates were used by:
- Browser extension (January 2026)
- Gradio demo (initial version)
- Benchmark generation (`data/benchmarks/v1/`)

## Related Files

- **Benchmark data:** `data/benchmarks/v1/`
- **Evaluation notebooks:** `notebooks/05_easy_language_evaluation.ipynb`
- **Development work:** `prompts/development/01_prompt_exploration_alastair.ipynb`
