# Demo Logging Setup

This document describes the structured JSONL logging system for the KlarText Demo UI, which captures simplification outputs along with computed metrics and guardrail evaluations.

## Overview

The logging system automatically records each simplification request processed by the demo app. It computes readability metrics and evaluates guardrails to track output quality over time.

**Demo Mode:** For development and quality review purposes, raw source and output texts are stored alongside computed metrics. This allows reviewing actual simplifications to understand metric scores and guardrail failures.

## Architecture

```
apps/demo/app.py                    # Calls log_simplification() after each request
    ↓
apps/demo/demo_logger.py            # Computes metrics, evaluates guardrails, writes JSONL
    ↓
data/logs/demo_outputs.jsonl        # Append-only log file (one JSON object per line)
```

## Log Entry Structure

Each log entry contains the following fields:

```json
{
    "timestamp": "2026-01-08T14:30:00Z",
    "source_text": "Die Versicherungsnehmer sind verpflichtet...",
    "output_text": "Sie haben eine Versicherung...",
    "model": "llama-3.1-8b-instant",
    "template": "system_prompt_de.txt",
    "language": "de",
    "metrics": {
        "avg_sentence_len_words": 8.5,
        "pct_sentences_gt20": 0.0,
        "ari_score": 7.0,
        "meaning_cosine": 0.85
    },
    "guardrails_passed": 4,
    "guardrails_total": 4,
    "guardrails_failed": []
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 UTC timestamp |
| `source_text` | string | Original input text |
| `output_text` | string | Simplified output text |
| `model` | string | Model identifier (e.g., "llama-3.1-8b-instant") |
| `template` | string | Prompt template filename |
| `language` | string | Language code ("de" or "en") |
| `metrics` | object | Computed readability metrics |
| `guardrails_passed` | int | Number of guardrails that passed |
| `guardrails_total` | int | Total number of guardrails evaluated |
| `guardrails_failed` | array | Names of failed guardrails |

## Metrics

The following metrics are computed for each simplification:

### Average Sentence Length (`avg_sentence_len_words`)
- Average number of words per sentence in the output
- Target: ≤ 15 words for Easy Language

### Long Sentence Percentage (`pct_sentences_gt20`)
- Percentage of sentences with more than 20 words
- Target: ≤ 10%

### Automated Readability Index (`ari_score`)
- Formula: `4.71 × (chars/words) + 0.5 × (words/sentences) - 21.43`
- Lower scores indicate easier readability
- Target: ≤ 8 (8th grade level)

### Meaning Preservation (`meaning_cosine`)
- TF-IDF cosine similarity between source and output
- Higher scores indicate better meaning preservation
- Target: ≥ 0.70

## Guardrails

Four guardrails are evaluated for each output:

| Guardrail | Condition | Purpose |
|-----------|-----------|---------|
| Short Sentences | avg_sentence_len_words ≤ 15 | Ensure sentences are concise |
| No Long Sentences | pct_sentences_gt20 ≤ 10% | Limit overly complex sentences |
| Readable (ARI) | ari_score ≤ 8 | Ensure appropriate reading level |
| Preserves Meaning | meaning_cosine ≥ 0.70 | Ensure content fidelity |

## Usage

### Automatic Logging (Demo App)

The demo app (`apps/demo/app.py`) automatically logs each simplification:

```python
from demo_logger import log_simplification

# Called automatically after successful simplification
log_simplification(
    source_text=input_text,
    output_text=simplified_text,
    model=GROQ_MODEL,
    template=template_filename,
    language=target_lang
)
```

Logging is best-effort and never fails the user request.

### Manual Logging (Python)

```python
from demo.demo_logger import log_simplification

entry = log_simplification(
    source_text="Complex input text...",
    output_text="Simple output...",
    model="llama-3.1-8b-instant",
    template="system_prompt_de.txt",
    language="de"
)
print(entry)
```

### Loading Logs

```python
from demo.demo_logger import load_all_logs, compute_aggregate_stats

# Load all entries
logs = load_all_logs()
print(f"Total entries: {len(logs)}")

# Get aggregate statistics
stats = compute_aggregate_stats()
print(f"Pass rate: {stats['guardrails_summary']['pass_rate']}%")
```

### Viewing Logs as DataFrame

Use the notebook `notebooks/12_demo_logging_setup.ipynb` (Step 9) to view logs in a tabular format with running averages:

```python
import json
import pandas as pd
from pathlib import Path

LOG_FILE = Path("data/logs/demo_outputs.jsonl")

logs = []
with open(LOG_FILE) as f:
    for line in f:
        if line.strip():
            logs.append(json.loads(line))

# Flatten to DataFrame
df = pd.DataFrame([
    {
        "timestamp": log["timestamp"],
        "model": log["model"],
        "language": log["language"],
        "source_text_len": log.get("source_text_len", 0),
        "output_text_len": log.get("output_text_len", 0),
        **log["metrics"],
        "guardrails_passed": log["guardrails_passed"],
    }
    for log in logs
])

# Display averages
print(df[["avg_sentence_len_words", "ari_score", "meaning_cosine"]].mean())
```

## Files

| File | Description |
|------|-------------|
| `apps/demo/demo_logger.py` | Logger module with metrics and guardrails |
| `apps/demo/app.py` | Demo app with logging integration |
| `data/logs/demo_outputs.jsonl` | Main log file (JSONL format) |
| `data/logs/demo_outputs_summary.json` | Exported summary with averages |
| `notebooks/12_demo_logging_setup.ipynb` | Setup notebook with DataFrame display |

## Aggregate Statistics

The `compute_aggregate_stats()` function returns:

```python
{
    "total_entries": 10,
    "avg_metrics": {
        "avg_avg_sentence_len_words": 6.49,
        "avg_pct_sentences_gt20": 0.0,
        "avg_ari_score": 5.68,
        "avg_meaning_cosine": 0.56
    },
    "guardrails_summary": {
        "total_passed": 35,
        "total_checks": 40,
        "pass_rate": 87.5,
        "failure_counts": {
            "Preserves Meaning": 4,
            "Readable (ARI)": 1
        }
    }
}
```

## Exporting Summary

To export logs with a summary header:

```python
from demo.demo_logger import load_all_logs, compute_aggregate_stats
import json

logs = load_all_logs()
stats = compute_aggregate_stats()

export_data = {
    "summary": stats,
    "entries": logs
}

with open("data/logs/demo_outputs_summary.json", "w") as f:
    json.dump(export_data, f, indent=2)
```

Or use Step 10 in the notebook.

## Dependencies

- Python 3.9+
- `scikit-learn` (optional, for meaning cosine similarity)

If `scikit-learn` is not installed, `meaning_cosine` will always return 0.0.

## Scheduled Metrics Reports

The metrics reporter can run automatically every 48 hours to provide ongoing visibility into simplification quality.

### One-Time Report

Generate an immediate metrics overview:

```bash
# Print to console
python scripts/metrics_reporter.py

# Save to file
python scripts/metrics_reporter.py --output data/logs/reports/report.txt

# JSON format with breakdown by model/language
python scripts/metrics_reporter.py --json --breakdown
```

### Scheduled Reports (Every 48 Hours)

Run the scheduler for continuous monitoring:

```bash
# Run in foreground (for testing)
python scripts/run_scheduled_metrics.py

# Run in background (production)
nohup python scripts/run_scheduled_metrics.py > metrics_scheduler.log 2>&1 &

# Custom interval (e.g., every 24 hours)
python scripts/run_scheduled_metrics.py --interval 24

# Run once and exit (for cron jobs)
python scripts/run_scheduled_metrics.py --run-once
```

### Using with Cron

For persistent scheduling on Linux/macOS, add to crontab:

```bash
# Edit crontab
crontab -e

# Add line (runs every 48 hours at midnight)
0 0 */2 * * cd /path/to/klartext && python scripts/run_scheduled_metrics.py --run-once >> data/logs/metrics_cron.log 2>&1
```

### Report Output Format

```
============================================================
📈 DEMO METRICS OVERVIEW
============================================================
Generated: 2026-01-19 10:30:00 UTC
Total Entries: 28

📊 AVERAGES (Running Statistics)
----------------------------------------
   avg_sentence_len_words: 5.94
   pct_sentences_gt20: 0.00
   ari_score: 5.86
   meaning_cosine: 0.73

✅ Guardrails Pass Rate: 96.4%
   (27/28 checks passed)

   Failed guardrails breakdown:
     - Preserves Meaning: 1 failures
============================================================
```

## Troubleshooting

### Logs not appearing
- Check that `apps/demo/demo_logger.py` exists and is importable
- Verify `data/logs/` directory exists (created automatically)
- Check console for warning messages during simplification

### Low meaning_cosine scores
- This metric uses TF-IDF, which may underperform when vocabulary differs significantly between source and output
- Consider this a rough heuristic, not a definitive measure

### sklearn import errors
- Install with: `pip install scikit-learn`
- The logger gracefully degrades if sklearn is unavailable
