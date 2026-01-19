# KlarText Benchmarks

This directory contains canonical benchmark datasets for evaluating KlarText simplification performance.

## Directory Structure

```
benchmarks/
├── v1/                                    # Version 1 benchmark (Jan 2026)
│   ├── klartext_benchmark_v1.json        # Main benchmark dataset (300 items)
│   ├── klartext_combined_chunks.json     # Combined results with metadata (778 chunks)
│   └── outputs/                          # Individual simplified outputs (300 files)
│       └── *.txt
└── README.md                             # This file
```

## Version 1 Benchmark

**Created:** January 2026  
**Source:** Browser extension real-world usage  
**Items:** 300 web content simplifications  
**Language:** English  
**Model:** System prompt v1 with Groq LLM

### Dataset Format

#### `klartext_benchmark_v1.json`

One JSON object per line (JSONL format):

```json
{
  "id": "dc064bf69e1e0d53",
  "source_file": "klartext-results-1768418429279.json",
  "page_url": "https://example.com/page",
  "page_title": "Example Page Title",
  "run_timestamp": "2026-01-14T19:20:29.134Z",
  "element_tag": "p",
  "status": "success",
  "error": null,
  "source_text": "Original complex text from the webpage...",
  "prev_output": "Simplified version of the text..."
}
```

**Fields:**
- `id`: Unique identifier for the text chunk
- `source_file`: Original results file from browser extension
- `page_url`: URL where the text was found
- `page_title`: Title of the source webpage
- `run_timestamp`: When the simplification was performed
- `element_tag`: HTML element type (p, div, span, etc.)
- `status`: "success" or "failed"
- `error`: Error message if status is "failed", otherwise null
- `source_text`: Original complex text
- `prev_output`: Simplified text output (only present if status is "success")

#### `klartext_combined_chunks.json`

Similar format to benchmark_v1.json but includes all chunks processed, including duplicates and variations. Contains 778 total entries.

#### `outputs/` Directory

Individual text files named `{sequence}__{id}.txt` containing just the simplified output text. Useful for batch analysis or manual review.

Example: `0001__dc064bf69e1e0d53.txt`

## Usage in Notebooks

### Loading the Benchmark

```python
import json
from pathlib import Path

# Load benchmark data
BENCHMARK_PATH = Path("../data/benchmarks/v1/klartext_benchmark_v1.json")

with open(BENCHMARK_PATH, 'r') as f:
    benchmark_items = [json.loads(line) for line in f]

# Filter successful simplifications only
successful = [item for item in benchmark_items if item['status'] == 'success']

print(f"Total items: {len(benchmark_items)}")
print(f"Successful: {len(successful)}")
```

### Analyzing Outputs

```python
from pathlib import Path

# Read all output files
OUTPUTS_DIR = Path("../data/benchmarks/v1/outputs")
outputs = {}

for file_path in sorted(OUTPUTS_DIR.glob("*.txt")):
    text_id = file_path.stem.split("__")[1]  # Extract ID from filename
    outputs[text_id] = file_path.read_text(encoding='utf-8')

print(f"Loaded {len(outputs)} simplified outputs")
```

### Evaluating Against New Prompts

```python
# Compare v1 outputs with new prompt results
import pandas as pd

# Load v1 benchmark
benchmark_v1 = []
with open("../data/benchmarks/v1/klartext_benchmark_v1.json") as f:
    benchmark_v1 = [json.loads(line) for line in f if json.loads(line)['status'] == 'success']

# Run new prompt on same source texts
new_results = []
for item in benchmark_v1[:50]:  # Test on first 50 items
    simplified = simplify_with_new_prompt(item['source_text'])
    new_results.append({
        'id': item['id'],
        'source': item['source_text'],
        'v1_output': item['prev_output'],
        'v2_output': simplified,
        'v1_lix': compute_lix(item['prev_output']),
        'v2_lix': compute_lix(simplified)
    })

# Compare metrics
df = pd.DataFrame(new_results)
print(f"V1 avg LIX: {df['v1_lix'].mean():.1f}")
print(f"V2 avg LIX: {df['v2_lix'].mean():.1f}")
```

## Benchmark Characteristics

### Domain Coverage
- Web accessibility documentation (W3C, WCAG)
- Government/public services (GOV.UK, etc.)
- News and media (Reddit, Vanity Fair, etc.)
- Technical documentation (IANA, etc.)
- Various HTML elements (paragraphs, headings, lists, spans)

### Text Length Distribution
- **Short:** < 50 characters (many nav/UI elements)
- **Medium:** 50-200 characters (typical sentences/paragraphs)
- **Long:** 200+ characters (complex explanations)

### Quality Metrics
Use this benchmark to track:
- **LIX score** (readability index, target: ≤ 40)
- **Average sentence length** (target: ≤ 15 words)
- **Percentage of long sentences** (> 20 words, target: ≤ 10%)
- **Structure preservation** (bullets, formatting)
- **Meaning preservation** (semantic similarity)

## Versioning

As prompts and models improve, create new benchmark versions:

```
benchmarks/
├── v1/          # Original baseline (system_prompt_en.txt)
├── v2/          # New prompt iteration (system_prompt_en_v2.txt)
└── v3/          # Future iterations
```

**Best practice:** Keep source texts consistent across versions to enable direct comparison.

## Data Provenance

- **Collection method:** Browser extension used on real web pages
- **Collection period:** January 13-14, 2026
- **Model:** Groq LLM with KlarText system prompt v1
- **Language:** English
- **Accessibility focus:** Many items from accessibility-focused websites

## Privacy & Compliance

- ✅ All text is from public websites
- ✅ No personal identifiable information (PII)
- ✅ Source URLs preserved for attribution
- ⚠️ Do not use for training without reviewing website terms of service

## See Also

- **Evaluation notebook:** `notebooks/05_easy_language_evaluation.ipynb`
- **Scoring metrics:** `notebooks/07_model_scoring.ipynb`
- **Prompt development:** `prompts/03.1_prompt_scoring_erinn.ipynb`
- **Demo outputs:** `data/logs/demo_outputs.jsonl` (Gradio demo logs)
