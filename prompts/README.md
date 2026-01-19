# Prompts Directory

This directory contains versioned prompt templates and development notebooks for the KlarText text simplification system.

## Structure

```
prompts/
├── templates/                       # Production prompt templates (versioned)
│   ├── v1/                          # Baseline prompts (used for benchmarks/v1)
│   │   ├── system_prompt_en.txt
│   │   ├── user_prompt_en.txt
│   │   ├── system_prompt_de.txt
│   │   ├── user_prompt_de.txt
│   │   └── VERSION_NOTES.md
│   ├── v2/                          # Current improved prompts
│   │   ├── system_prompt_en.txt    (enhanced version)
│   │   ├── user_prompt_en.txt
│   │   ├── system_prompt_de.txt
│   │   ├── user_prompt_de.txt
│   │   └── VERSION_NOTES.md
│   └── current -> v2/               # Symlink to latest version
├── development/                     # Prompt experimentation notebooks
│   ├── 01_prompt_exploration_alastair.ipynb
│   ├── 02_final_prompt_evaluation.ipynb
│   ├── 03_prompt_scoring.ipynb
│   └── 03.1_prompt_scoring_erinn.ipynb
└── README.md
```

## Versioning Strategy

This directory uses **path-based versioning** - versions are indicated by directory structure, not filename suffixes.

### Why Path-Based Versioning?

**Before (filename-based):**
```
templates/
├── system_prompt_en.txt
├── system_prompt_en_v2.txt
├── system_prompt_en_v3.txt
└── system_prompt_de_final.txt    # Unclear version
```
❌ Filename clutter, unclear which is "current", hard to manage

**After (path-based):**
```
templates/
├── v1/
│   └── system_prompt_en.txt
├── v2/
│   └── system_prompt_en.txt
└── current -> v2/                # Clear "current" version
```
✅ Clean filenames, explicit versioning, symlink shows current

### Benefits

1. **Consistent naming** - All files use same base names across versions
2. **Easy comparison** - `diff v1/system_prompt_en.txt v2/system_prompt_en.txt`
3. **Clear "current"** - Symlink indicates active version
4. **Version metadata** - Each version has its own `VERSION_NOTES.md`
5. **Rollback ready** - Just update symlink to revert
6. **Aligns with benchmarks** - Same pattern as `data/benchmarks/v1/`, `v2/`

### Version Reference in Code

Applications reference templates via the `current/` symlink:
```python
# Demo app (demo/app.py)
TEMPLATE_FILES = {
    "en": {
        "system": "current/system_prompt_en.txt",  # Always uses latest
        "user": "current/user_prompt_en.txt",
    }
}
```

To use a specific version (e.g., for evaluation):
```python
# Use v1 for comparison
system_prompt = Path("prompts/templates/v1/system_prompt_en.txt").read_text()
```

## Template Versions

### Version 1 (Baseline)
- **Status:** Used for `data/benchmarks/v1/`
- **Performance:** LIX ~37.3, good readability
- **Characteristics:** Concise rules, 2-3 examples, clear formatting
- **See:** `templates/v1/VERSION_NOTES.md`

### Version 2 (Current)
- **Status:** Active development, used by demo and API
- **Improvements:** Enhanced rules, better examples, edge case handling
- **Changes:** ~118 lines vs 61 in v1, more detailed guidance
- **See:** `templates/v2/VERSION_NOTES.md`

## Template Structure

All prompts use a **split prompt pattern**:

1. **System Prompt** (`system_prompt_*.txt`):
   - LLM identity and role
   - Comprehensive rules for simplification
   - Few-shot examples showing transformations
   - Output format requirements
   - Constraints and edge cases

2. **User Prompt** (`user_prompt_*.txt`):
   - Task instruction with `{{text}}` placeholder
   - Handlebars template rendered at runtime
   - Minimal and focused on the specific request

### Example Usage

```python
from pathlib import Path
from pybars import Compiler

# Load templates
template_dir = Path("prompts/templates/current")  # Uses symlink
system_prompt = (template_dir / "system_prompt_en.txt").read_text()
user_template = (template_dir / "user_prompt_en.txt").read_text()

# Render user prompt with actual text
compiler = Compiler()
template = compiler.compile(user_template)
user_prompt = template({"text": "Complex text to simplify..."})

# Send to LLM
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_prompt}
]
```

## Prompt Guidelines

When writing or improving prompts:

### Core Principles
1. **Short sentences** - Target ≤15 words average
2. **Simple vocabulary** - Common, everyday words
3. **Clear structure** - Use bullet points, headings, whitespace
4. **Active voice** - Prefer active over passive constructions
5. **No hallucinations** - Only simplify what's there, don't add facts

### Simplification Levels

While templates can support multiple levels, current focus is on **"very easy"** / **"easy"**:

- **Very Easy**: Very short sentences; define all uncommon words; extra whitespace
- **Easy**: Short sentences; clear structure; minimal jargon

### Special Content

- **Legal/Medical/Financial**: Add "This is not professional advice" disclaimer
- **Technical terms**: Explain unavoidable technical words
- **Ambiguous input**: Say so clearly rather than guessing

## Development Workflow

### Creating a New Prompt Version

1. **Copy previous version** as starting point:
   ```bash
   cp -r prompts/templates/v2 prompts/templates/v3
   ```

2. **Make improvements** in the new version directory

3. **Document changes** in `VERSION_NOTES.md`

4. **Test with development notebooks**:
   - Use `prompts/development/` notebooks
   - Test on `data/samples/` texts
   - Compare with previous version

5. **Generate benchmark** if satisfied:
   ```bash
   # Run evaluation on same inputs as v1
   # Save results to data/benchmarks/v3/
   ```

6. **Update symlink** if deploying to production:
   ```bash
   cd prompts/templates
   rm current
   ln -s v3 current
   ```

7. **Update applications** that reference the templates

### Testing New Prompts

1. **Gradio Demo** (`demo/app.py`):
   - Already uses `current/` symlink
   - Just restart demo to test new version
   - Check quality scores in UI

2. **Evaluation Notebooks**:
   - `notebooks/05_easy_language_evaluation.ipynb` - Comprehensive evaluation
   - `notebooks/07_model_scoring.ipynb` - Automated scoring
   - `prompts/development/03_prompt_scoring.ipynb` - Prompt-specific metrics

3. **Sample Texts**:
   - Test on `data/samples/` (diverse text types)
   - Check `data/easy/` (calibration - should not change these)
   - Try `data/hard/` (complex inputs - should simplify well)

## Evaluation Metrics

Track these metrics when comparing versions:

### Quantitative
- **LIX Score**: Readability index (target: ≤ 40)
- **Average sentence length**: Words per sentence (target: ≤ 15)
- **Long sentences**: Percentage > 20 words (target: ≤ 10%)
- **Average word length**: Characters per word
- **Semantic similarity**: TF-IDF cosine similarity with source (> 0.3)

### Qualitative
- **Meaning preservation**: Does it keep the core message?
- **Structure quality**: Good use of bullets, headings?
- **Readability**: Easy to understand for target audience?
- **Accuracy**: No hallucinated facts or incorrect simplifications?
- **Consistency**: Similar inputs produce similar outputs?

## Version History

| Version | Date | Status | Key Changes | Benchmark |
|---------|------|--------|-------------|-----------|
| v1 | Jan 2026 | Baseline | Original prompts, few-shot examples | `benchmarks/v1/` |
| v2 | Jan 2026 | Current | Enhanced rules, better examples, ~2x length | In progress |

## Related Documentation

- **Benchmark datasets**: `data/benchmarks/README.md`
- **Sample texts**: `data/samples/`
- **Evaluation framework**: `notebooks/05_easy_language_evaluation.ipynb`
- **API integration**: `services/api/README.md`
- **Demo app**: `demo/README.md`

## Notes

- The `current/` symlink always points to the version used by demo and API
- Keep all versions for comparison and rollback capability
- Template changes should be accompanied by benchmark generation
- Document all significant changes in VERSION_NOTES.md
- Test thoroughly before updating `current/` symlink
