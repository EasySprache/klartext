# Easy Language LLM Evaluation Script

> **Script:** `evaluate_easy_language.py`  
> **Purpose:** Evaluate LLM models on their ability to convert complex text into Easy Language (Leichte Sprache)

---

## 📋 Overview

This script automates the evaluation of Large Language Models (LLMs) on their ability to simplify text according to Easy Language rules. It:

1. Takes complex sentences as input
2. Sends them to multiple LLMs for simplification
3. Uses a separate evaluator LLM to score the results
4. Outputs detailed metrics and a summary

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT                                     │
│  • Test sentences (default or from file)                        │
│  • Model list (default or custom)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLIFICATION LOOP                          │
│  For each sentence × each model:                                │
│    1. Send to LLM with Easy Language system prompt              │
│    2. Receive simplified text                                   │
│    3. Calculate basic metrics (word count, sentence length)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVALUATION LOOP                              │
│  For each simplified result:                                    │
│    1. Send original + simplified to evaluator LLM               │
│    2. Receive JSON scores (0-10) for each criterion             │
│    3. Collect violation notes                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OUTPUT                                    │
│  • CSV file with all results                                    │
│  • Summary table by model                                       │
│  • Best model identification                                    │
│  • Common violations analysis                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📜 Easy Language Rules

The script evaluates against these criteria:

### Sentence Level
| Rule | Description |
|------|-------------|
| Length | Max 15-20 words per sentence |
| Commas | Ideally one comma per sentence |
| Structure | No parenthetical insertions or nested sentences |
| Voice | Active verbs only, avoid passive voice |
| Clarity | Clear, unambiguous sentences |

### Word Level
| Rule | Description |
|------|-------------|
| Foreign words | Avoid whenever possible |
| Compound words | Explain difficult/long words, use hyphens |
| Idioms | Avoid idioms, irony, and metaphors |
| Abbreviations | Write out fully |
| Negations | Avoid negative constructions |
| Synonyms | Stick to one term, avoid synonyms |

---

## 🔧 Code Structure

### 1. Configuration Section
```python
DEFAULT_MODELS = [...]      # Models to test
EVAL_MODEL = "..."          # LLM used for evaluation
RULES_TEXT = "..."          # Easy Language rules (sent to LLMs)
DEFAULT_TEST_SENTENCES = [] # Default test cases
```

### 2. Helper Functions

#### `count_words(text: str) -> int`
Counts the number of words in a text by splitting on whitespace.

#### `count_sentences(text: str) -> int`
Counts sentences by splitting on `.!?` punctuation.

#### `avg_sentence_length(text: str) -> float`
Calculates the average number of words per sentence.

#### `simplify_text(client, text, model) -> str`
Sends text to an LLM for simplification:
- Creates a system prompt with Easy Language rules
- Calls the Groq API with temperature=0.2 (low randomness)
- Returns the simplified text

#### `evaluate_compliance(client, original, simplified) -> dict`
Uses the evaluator LLM to score a simplification:
- Sends both original and simplified text
- Requests JSON output with scores (0-10) for each criterion
- Returns dictionary with scores and violation notes

### 3. Main Evaluation Function

#### `run_evaluation(models, test_sentences, output_path, verbose) -> DataFrame`
The core function that orchestrates the evaluation:

```python
def run_evaluation(...):
    # 1. Connect to Groq API
    client = Groq(api_key=api_key)
    
    # 2. Loop through all combinations
    for sentence in test_sentences:
        for model in models:
            # 2a. Simplify the text
            simplified = simplify_text(client, sentence, model)
            
            # 2b. Calculate metrics
            orig_words = count_words(sentence)
            simp_words = count_words(simplified)
            # ...
            
            # 2c. Evaluate with LLM
            eval_data = evaluate_compliance(client, sentence, simplified)
            
            # 2d. Store results
            results.append({...})
    
    # 3. Create DataFrame and save
    df = pd.DataFrame(results)
    df.to_csv(output_path)
    
    return df
```

### 4. CLI Interface

#### `parse_args()`
Defines command-line arguments:
- `--models`: Custom model list
- `--output`: Output file path
- `--sentences-file`: Custom test sentences
- `--verbose`: Detailed output
- `--list-models`: Show available models

#### `main()`
Entry point that:
1. Parses arguments
2. Sets up configuration
3. Calls `run_evaluation()`

---

## 📊 Output Format

### CSV Columns
| Column | Description |
|--------|-------------|
| `sentence_id` | Index of the test sentence |
| `model` | Model ID used for simplification |
| `original` | Original complex sentence |
| `simplified` | LLM-generated simplified text |
| `orig_word_count` | Words in original |
| `simp_word_count` | Words in simplified |
| `orig_avg_sentence_len` | Avg words/sentence (original) |
| `simp_avg_sentence_len` | Avg words/sentence (simplified) |
| `sentence_length_score` | Score 0-10 |
| `structure_score` | Score 0-10 |
| `active_voice_score` | Score 0-10 |
| `word_choice_score` | Score 0-10 |
| `clarity_score` | Score 0-10 |
| `overall_score` | Score 0-10 |
| `violation_notes` | List of rule violations |
| `strengths` | List of positive aspects |

---

## 🔌 API Flow

```
User                    Script                  Groq API
  │                        │                        │
  │── Run script ─────────>│                        │
  │                        │── List models ────────>│
  │                        │<── Model list ─────────│
  │                        │                        │
  │                        │   [For each sentence]  │
  │                        │   [For each model]     │
  │                        │                        │
  │                        │── Simplify request ───>│
  │                        │   (system: rules)      │
  │                        │   (user: sentence)     │
  │                        │<── Simplified text ────│
  │                        │                        │
  │                        │── Evaluate request ───>│
  │                        │   (original+simplified)│
  │                        │<── JSON scores ────────│
  │                        │                        │
  │<── Results + CSV ──────│                        │
```

---

## 🚀 Usage Examples

### Basic Run
```bash
python scripts/evaluate_easy_language.py
```

### Custom Models
```bash
python scripts/evaluate_easy_language.py \
    --models "gemma2-9b-it,mixtral-8x7b-32768"
```

### Custom Test Sentences
Create a file `my_sentences.txt`:
```
This is a complex sentence with many clauses.
Another difficult sentence to simplify.
```

Then run:
```bash
python scripts/evaluate_easy_language.py \
    --sentences-file my_sentences.txt
```

### Full Verbose Run
```bash
python scripts/evaluate_easy_language.py \
    --models "qwen/qwen3-32b" \
    --output results/test_run.csv \
    --verbose
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `pandas` | Data handling and CSV export |
| `groq` | Groq API client |
| `python-dotenv` | Load API key from .env file |

Install with:
```bash
pip install pandas groq python-dotenv
```

---

## 🔐 Environment Setup

Create a `.env` file in the project root:
```
GROQ_API_KEY=your_api_key_here
```

Get your API key from: https://console.groq.com/keys

---

## 📈 Extending the Script

### Adding New Models
Edit `DEFAULT_MODELS` in the script or use `--models` flag.

### Adding New Evaluation Criteria
1. Update `RULES_TEXT` with new rules
2. Update `evaluate_compliance()` prompt to request new scores
3. Update `print_summary()` to include new columns

### Adding New Test Sentences
1. Create a text file with one sentence per line
2. Use `--sentences-file` flag

---

## 🔗 Related Files

- `notebooks/03_model_exploration_baseline.ipynb` - Interactive notebook version
- `notebooks/03_model_exploration_simon.ipynb` - Original exploration notebook
- `notebooks/03_model_exploration_alastair.ipynb` - Alternative exploration approach

