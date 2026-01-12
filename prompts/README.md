# Prompts Directory

This directory contains prompt templates and evaluation fixtures for the KlarText simplification engine.

## Structure

```
prompts/
├── templates/          # LLM prompt templates (split system/user)
│   ├── system_prompt_en.txt
│   ├── user_prompt_en.txt
│   ├── system_prompt_de.txt
│   └── user_prompt_de.txt
├── 01_prompt_exploration_alastair.ipynb
├── 02_final_prompt_evaluation.ipynb
├── 03_prompt_scoring.ipynb
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

The primary evaluation notebook is `notebooks/07_model_scoring.ipynb` (Model Scoring) and `prompts/03_prompt_scoring.ipynb` (Prompt Scoring). These notebooks use a rule-based approach to check compliance with Easy Language standards.

### Metrics
- **Short Sentences**: Checks if >15% of sentences have >10 words.
- **Structure**: Checks for bullet points and clear paragraphs.
- **Content Constraints**: Checks for no intro/outro text and no XML tags.
- **Meaning Preservation**: TF-IDF cosine similarity > 0.3.
- **Active Voice**: Usage of active voice construction.

### Usage
1. Add sample texts to `data/samples/`.
2. Run `notebooks/07_model_scoring.ipynb` to evaluate model performance on these samples.

