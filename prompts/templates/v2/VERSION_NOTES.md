# Prompt Templates Version 2

**Date:** January 2026  
**Status:** Current / Active Development  
**Model:** Groq LLM (llama-3.1-8b-instant)

## Overview

Version 2 represents an improved iteration of the prompt templates based on evaluation of v1 performance and extended development work. Focus on more detailed rules and better handling of edge cases.

## Files

- `system_prompt_en.txt` - Enhanced English system prompt (~118 lines)
- `user_prompt_en.txt` - English user prompt template (same as v1)
- `system_prompt_de.txt` - German system prompt (same as v1, to be updated)
- `user_prompt_de.txt` - German user prompt template (same as v1, to be updated)

## Changes from V1

### English System Prompt (system_prompt_en.txt)

**Major Enhancements:**
1. **Expanded rules section** - More detailed guidance on:
   - Active voice usage
   - Technical term handling
   - Structure and formatting requirements
   - Edge case handling

2. **Better examples** - More diverse example transformations showing:
   - Different text types (legal, medical, technical)
   - Various input lengths
   - Edge cases (very short text, lists, etc.)

3. **Clearer constraints** - Explicit instructions about:
   - Not hallucinating information
   - Preserving meaning and accuracy
   - When to add disclaimers
   - How to handle ambiguity

4. **Output format** - More consistent formatting guidance:
   - Bullet point usage
   - Paragraph breaks
   - Heading preservation

**Length:** ~118 lines (vs. 61 in v1)

## Expected Improvements

Based on development notebooks (`prompts/development/03.1_prompt_scoring_erinn.ipynb`):

- **Better consistency** - More uniform output quality
- **Fewer hallucinations** - Stricter adherence to source content
- **Better technical handling** - Improved balance between simplification and accuracy
- **Edge case handling** - Better performance on very short or very long inputs

## Testing Status

- ✅ Manual testing in Gradio demo
- ✅ Sample evaluation on test cases
- ⏳ Full benchmark evaluation pending (will create `data/benchmarks/v2/`)
- ⏳ A/B comparison with v1 in progress

## Usage

Currently used by:
- Gradio demo (as of restructure)
- Local testing and evaluation
- API (to be deployed after validation)

## Next Steps

1. **Generate v2 benchmark** - Run v2 on same inputs as v1 for direct comparison
2. **Quantitative evaluation** - Compare LIX scores, sentence lengths, etc.
3. **Qualitative review** - Manual review of output quality
4. **Update German prompts** - Apply v2 improvements to German templates
5. **Deploy to production** - After validation, update API and extension

## Related Files

- **Development work:** `prompts/development/03.1_prompt_scoring_erinn.ipynb`
- **Evaluation framework:** `notebooks/07_model_scoring.ipynb`
- **V1 baseline:** `prompts/templates/v1/`
