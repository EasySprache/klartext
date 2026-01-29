# KlarText Logging System Guide

**Privacy-preserving analytics and feedback loop**

This guide explains how to use the logging system to collect usage analytics and power the feedback loop for continuous improvement.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Setup](#backend-setup)
- [Frontend Integration](#frontend-integration)
- [Data Format](#data-format)
- [Privacy & Security](#privacy--security)
- [Analyzing Logs](#analyzing-logs)
- [Troubleshooting](#troubleshooting)

---

## Overview

The KlarText logging system collects telemetry data from simplification runs to enable:

- **Performance monitoring** - Track latency, throughput, errors
- **Quality assessment** - Measure readability scores, sentence length
- **Model comparison** - A/B test different models and prompts
- **User feedback** - Collect thumbs up/down ratings
- **Continuous improvement** - Identify patterns for optimization

### Key Features

✅ **Privacy-preserving** - Only stores SHA-256 hash of input text, not raw text
✅ **Non-blocking** - Logging runs asynchronously, doesn't slow down app
✅ **Structured** - JSONL format for easy analysis
✅ **File locking** - Handles concurrent writes safely
✅ **Optional** - Can be disabled via environment variable

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React)                                       │
└─────────────────────────────────────────────────────────┘
     │
     │ User clicks "Simplify"
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  1. Record start time                                   │
│  2. Call /v1/simplify API                              │
│  3. Receive simplified text                            │
│  4. Display to user                                    │
└─────────────────────────────────────────────────────────┘
     │
     │ (Async - doesn't block UI)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Logger (lib/logger.ts)                                 │
│                                                         │
│  1. Calculate latency                                  │
│  2. Generate run ID (UUID)                            │
│  3. Hash input text (SHA-256)                         │
│  4. Compute basic scores                              │
│  5. Build log entry                                   │
└─────────────────────────────────────────────────────────┘
     │
     │ POST /v1/log-run
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend API (/v1/log-run)                             │
│                                                         │
│  1. Validate request                                   │
│  2. Add timestamp if not provided                     │
│  3. Write to JSONL file with file locking            │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Storage (data/logs/api_runs.jsonl)                    │
│                                                         │
│  {"run_id": "...", "timestamp": "...", ...}            │
│  {"run_id": "...", "timestamp": "...", ...}            │
│  {"run_id": "...", "timestamp": "...", ...}            │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Analysis (Python notebooks, scripts)                   │
│                                                         │
│  - Aggregate statistics                                │
│  - Model comparison                                    │
│  - Quality trends                                      │
│  - Performance monitoring                              │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Setup

### 1. Environment Configuration

```bash
# Optional: Configure log file location
# Default: ./data/logs/api_runs.jsonl
export LOG_FILE_PATH="/path/to/logs/api_runs.jsonl"

# The directory must exist or will be created automatically
```

### 2. API Endpoint

The `/v1/log-run` endpoint is already implemented and ready to use.

**Test it:**
```bash
curl -X POST http://localhost:8000/v1/log-run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "run_id": "123e4567-e89b-12d3-a456-426614174000",
    "input_hash": "abc123...",
    "input_length": 150,
    "target_lang": "de",
    "level": "easy",
    "model_used": "llama-3.1-8b-instant",
    "output_length": 120,
    "latency_ms": 250,
    "chunk_count": 1,
    "scores": {"avg_sentence_len": 12.0, "word_count": 45},
    "warnings": []
  }'
```

**Response:**
```json
{
  "logged": true,
  "run_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 3. Using the Python Logger

```python
from app.core.run_logger import create_run_log_from_simplification

# After simplification
log_entry = create_run_log_from_simplification(
    run_id=str(uuid.uuid4()),
    input_text=original_text,
    output_text=simplified_text,
    target_lang="de",
    level="easy",
    model_used="llama-3.1-8b-instant",
    latency_ms=250,
    warnings=["contains_legal_content"]
)
```

---

## Frontend Integration

### 1. Import the Logger

```typescript
import { logSimplification } from '@/lib/logger';
```

### 2. Log Simplifications

```typescript
const handleSimplify = async () => {
  const startTime = Date.now(); // Track start time
  
  try {
    // Call simplify API
    const response = await apiJsonRequest('/v1/simplify', {
      text: inputText,
      target_lang: 'de',
      level: 'easy'
    });
    
    const data = await response.json();
    setOutputText(data.simplified_text);
    
    // Log the run (fire and forget - doesn't block UI)
    logSimplification({
      inputText: inputText,
      outputText: data.simplified_text,
      targetLang: 'de',
      level: 'easy',
      startTime: startTime,
      warnings: data.warnings || [],
    }).catch(err => {
      console.warn('Failed to log:', err);
    });
    
  } catch (err) {
    console.error('Simplification failed:', err);
  }
};
```

### 3. Log User Feedback (Optional)

```typescript
const handleThumbsUp = async () => {
  await logSimplification({
    inputText: currentInput,
    outputText: currentOutput,
    targetLang: 'de',
    level: 'easy',
    startTime: simplificationStartTime,
    userFeedback: 'thumbs_up'
  });
};
```

### 4. Advanced Usage with Custom Scores

```typescript
import { logSimplificationRun, hashText, generateRunId } from '@/lib/logger';

// Custom scoring logic
const customScores = {
  lix_score: 35.2,
  avg_sentence_len: 12.5,
  readability_grade: 6,
  word_count: 120,
  sentence_count: 10
};

await logSimplificationRun({
  inputText: input,
  outputText: output,
  targetLang: 'de',
  level: 'easy',
  model: 'llama-3.1-8b-instant',
  latencyMs: 342,
  chunkCount: 1,
  scores: customScores,
  warnings: [],
  userFeedback: undefined
});
```

---

## Data Format

### JSONL File Structure

Each line in the log file is a JSON object:

```jsonl
{"run_id":"abc-123","timestamp":"2026-01-27T10:30:00Z","input_hash":"a1b2c3...","input_length":150,"output_length":120,"target_lang":"de","level":"easy","model_used":"llama-3.1-8b-instant","latency_ms":250,"chunk_count":1,"scores":{"avg_sentence_len":12.0},"warnings":[],"user_feedback":null}
{"run_id":"def-456","timestamp":"2026-01-27T10:31:00Z","input_hash":"d4e5f6...","input_length":200,"output_length":180,"target_lang":"en","level":"very_easy","model_used":"llama-3.1-8b-instant","latency_ms":320,"chunk_count":1,"scores":{"avg_sentence_len":8.5},"warnings":["contains_legal_content"],"user_feedback":"thumbs_up"}
```

### Log Entry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_id` | string | Yes | Unique identifier (UUID) |
| `timestamp` | string | Yes | ISO 8601 timestamp (UTC) |
| `input_hash` | string | Yes | SHA-256 hash of input text |
| `input_length` | int | Yes | Character count of input |
| `output_length` | int | Yes | Character count of output |
| `target_lang` | string | Yes | Target language (`de` or `en`) |
| `level` | string | Yes | Simplification level (`very_easy`, `easy`, `medium`) |
| `model_used` | string | Yes | Model identifier |
| `latency_ms` | int | Yes | Processing time in milliseconds |
| `chunk_count` | int | No | Number of chunks (default: 1) |
| `scores` | object | No | Quality scores (arbitrary key-value pairs) |
| `warnings` | array | No | Warning strings |
| `user_feedback` | string | No | User feedback (`thumbs_up`, `thumbs_down`, `flag`) |

---

## Privacy & Security

### What We Store

✅ **Stored:**
- SHA-256 hash of input text (for deduplication)
- Input and output text lengths
- Language, level, model used
- Processing time (latency)
- Quality scores (readability metrics)
- Warnings and user feedback

❌ **NOT Stored:**
- Raw input text
- Raw output text
- User IP addresses
- User identifiers
- Session tokens
- Personal information (PII)

### Why Hash Input Text?

```python
# Original text (not stored)
"Ich möchte einen Termin vereinbaren."

# SHA-256 hash (stored)
"a1b2c3d4e5f6789..."
```

**Benefits:**
- **Deduplication** - Identify repeated inputs without storing text
- **Cache lookup** - Check if we've seen this input before
- **Privacy** - No way to reverse the hash back to original text
- **Compliance** - Meets GDPR/privacy requirements

### File Security

```python
# File locking prevents concurrent write corruption
with open(log_file, "a") as f:
    fcntl.flock(f.fileno(), fcntl.LOCK_EX)  # Exclusive lock
    f.write(json.dumps(entry) + "\n")
    fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
```

**Protections:**
- File locking prevents race conditions
- Append-only mode (no overwrites)
- UTF-8 encoding for international characters
- Flush after write ensures durability

---

## Analyzing Logs

### Load and Analyze in Python

```python
from app.core.run_logger import load_all_logs, compute_aggregate_stats

# Load all logs
logs = load_all_logs()
print(f"Total runs: {len(logs)}")

# Compute aggregate statistics
stats = compute_aggregate_stats()
print(f"Average latency: {stats['avg_latency_ms']}ms")
print(f"Average input length: {stats['avg_input_length']} chars")
print(f"Languages: {stats['languages']}")
print(f"Levels: {stats['levels']}")
```

### Example Analysis

```python
import json
from pathlib import Path
from collections import Counter

# Load logs
log_file = Path("data/logs/api_runs.jsonl")
logs = []
with open(log_file) as f:
    for line in f:
        logs.append(json.loads(line))

# Average latency by level
level_latencies = {}
for log in logs:
    level = log['level']
    if level not in level_latencies:
        level_latencies[level] = []
    level_latencies[level].append(log['latency_ms'])

for level, latencies in level_latencies.items():
    avg = sum(latencies) / len(latencies)
    print(f"{level}: {avg:.1f}ms (n={len(latencies)})")

# Most common warnings
warnings = []
for log in logs:
    warnings.extend(log.get('warnings', []))

warning_counts = Counter(warnings)
print("\nMost common warnings:")
for warning, count in warning_counts.most_common(5):
    print(f"  {warning}: {count}")

# User feedback summary
feedback_counts = Counter(
    log.get('user_feedback') for log in logs 
    if log.get('user_feedback')
)
print("\nUser feedback:")
print(f"  Thumbs up: {feedback_counts.get('thumbs_up', 0)}")
print(f"  Thumbs down: {feedback_counts.get('thumbs_down', 0)}")
print(f"  Flagged: {feedback_counts.get('flag', 0)}")
```

### Jupyter Notebook Analysis

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load logs into DataFrame
logs_df = pd.read_json('data/logs/api_runs.jsonl', lines=True)

# Convert timestamp to datetime
logs_df['timestamp'] = pd.to_datetime(logs_df['timestamp'])

# Plot latency over time
logs_df.plot(x='timestamp', y='latency_ms', kind='scatter')
plt.title('Simplification Latency Over Time')
plt.ylabel('Latency (ms)')
plt.show()

# Distribution of input lengths
logs_df['input_length'].hist(bins=50)
plt.title('Input Length Distribution')
plt.xlabel('Characters')
plt.show()

# Average latency by level
logs_df.groupby('level')['latency_ms'].mean().plot(kind='bar')
plt.title('Average Latency by Level')
plt.ylabel('Latency (ms)')
plt.show()
```

---

## Troubleshooting

### Logs Not Being Created

**Check 1: Directory exists**
```bash
mkdir -p data/logs
```

**Check 2: Permissions**
```bash
chmod 755 data/logs
```

**Check 3: Environment variable**
```bash
echo $LOG_FILE_PATH
# Should show path or be empty (uses default)
```

**Check 4: API endpoint**
```bash
curl -X POST http://localhost:8000/v1/log-run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"run_id":"test","input_hash":"test","input_length":10,"target_lang":"de","level":"easy","model_used":"test","output_length":10,"latency_ms":100}'
```

### Frontend Not Logging

**Check 1: Import**
```typescript
import { logSimplification } from '@/lib/logger';
```

**Check 2: API key**
```typescript
// Make sure API key is set
import { getApiKey } from '@/lib/api';
console.log('API Key:', getApiKey());
```

**Check 3: Network requests**
```
Open browser DevTools → Network tab
Look for POST to /v1/log-run
Check status code (should be 200)
```

**Check 4: Console errors**
```
Open browser DevTools → Console tab
Look for any errors related to logging
```

### File Locking Issues

**Symptom:** Errors about file being locked

**Solution 1:** Ensure only one process writes at a time
```python
# File locking is automatic in run_logger.py
# No action needed unless using custom code
```

**Solution 2:** Check for zombie processes
```bash
lsof data/logs/api_runs.jsonl
# Kill any processes holding the file open
```

### Log File Too Large

**Check size:**
```bash
du -h data/logs/api_runs.jsonl
```

**Rotate logs:**
```bash
# Move current log
mv data/logs/api_runs.jsonl data/logs/api_runs_$(date +%Y%m%d).jsonl

# Create new empty log
touch data/logs/api_runs.jsonl
```

**Automated rotation (cron):**
```bash
# Add to crontab
0 0 * * 0 cd /path/to/klartext && mv data/logs/api_runs.jsonl data/logs/api_runs_$(date +\%Y\%m\%d).jsonl && touch data/logs/api_runs.jsonl
```

---

## Best Practices

### 1. Don't Block the UI

```typescript
// GOOD: Fire and forget
logSimplification({ ... }).catch(console.warn);

// BAD: Waiting for log to complete
await logSimplification({ ... });
```

### 2. Include Relevant Context

```typescript
logSimplification({
  inputText: input,
  outputText: output,
  targetLang: language,
  level: level,
  startTime: startTime,
  warnings: apiWarnings,  // Include API warnings
  userFeedback: feedback  // Include if available
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  await logSimplification({ ... });
} catch (err) {
  // Silent fail - don't show error to user
  console.warn('Logging failed:', err);
}
```

### 4. Rotate Logs Regularly

```bash
# Weekly rotation
0 0 * * 0 /path/to/rotate_logs.sh
```

### 5. Monitor Log Growth

```bash
# Alert if logs exceed 100MB
du -m data/logs/api_runs.jsonl | awk '$1 > 100 {print "Logs too large!"}'
```

---

## Related Documentation

- **[docs/scoring_feedback_pipeline_proposal.md](../../docs/scoring_feedback_pipeline_proposal.md)** - Feedback loop architecture
- **[README.md](./README.md)** - API documentation
- **[demo/demo_logger.py](../../demo/demo_logger.py)** - Demo logging (stores raw text)

---

**Status:** ✅ Production Ready
**Last Updated:** January 27, 2026
**Version:** 1.0
