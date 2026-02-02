# KlarText API Logging - Quick Start Guide

## ✅ Logging System Status

The logging system is **fully operational** and ready to use!

- ✅ Backend logger module: `app/core/run_logger.py`
- ✅ API endpoint: `/v1/log-run`
- ✅ Frontend logger: `apps/web-mvp/src/lib/logger.ts`
- ✅ Frontend integration: Automatic logging on every simplification
- ✅ Test suite: All tests passing
- ✅ Report generator: Automated reports ready

---

## 📊 Generate Reports

### Quick Report (Console)
```bash
cd services/api
python generate_api_report.py
```

### Save to File
```bash
python generate_api_report.py --output ../../data/logs/reports/my_report.txt
```

### JSON Format
```bash
python generate_api_report.py --json --output ../../data/logs/reports/my_report.json
```

---

## 🧪 Test the Logging System

### Run Full Test Suite
```bash
cd services/api
python test_logging.py
```

This tests:
1. Basic logging functionality
2. Multiple concurrent entries
3. Aggregate statistics computation
4. Convenience functions

---

## 📝 View Logs Directly

### Check Log File Location
```bash
cd services/api
python -c "from app.core.run_logger import get_log_file_path; print(get_log_file_path())"
```

### Count Total Logs
```bash
python -c "from app.core.run_logger import load_all_logs; print(f'{len(load_all_logs())} logs')"
```

### View Raw Log File
```bash
cat data/logs/api_runs.jsonl | jq .
```

### Quick Statistics
```bash
python -c "from app.core.run_logger import compute_aggregate_stats; import json; print(json.dumps(compute_aggregate_stats(), indent=2))"
```

---

## 🎯 What Gets Logged

Every simplification request logs:

| Field | Example | Description |
|-------|---------|-------------|
| `run_id` | `abc-123-def-456` | Unique identifier (UUID) |
| `timestamp` | `2026-01-27T10:30:00Z` | When it happened |
| `input_text` | `"Der Antrag..."` | Original text (full text stored) |
| `output_text` | `"Sie müssen..."` | Simplified text (full text stored) |
| `input_length` | `150` | Character count |
| `output_length` | `120` | Character count |
| `target_lang` | `de` | Language used |
| `level` | `easy` | Simplification level |
| `model_used` | `llama-3.1-8b-instant` | AI model |
| `latency_ms` | `342` | Processing time |
| `chunk_count` | `1` | Number of chunks |
| `scores` | `{"avg_sentence_len": 12.0}` | Quality metrics |
| `warnings` | `[]` | Any warnings |
| `user_feedback` | `null` | User feedback (if any) |

**Note**: For this study project, full text is stored. In production, you'd typically store only hashes for privacy.

---

## 📈 Sample Report Output

```
======================================================================
📊 KLARTEXT API LOGGING REPORT
======================================================================
Generated: 2026-02-02 13:46:23 UTC

📈 SUMMARY STATISTICS
----------------------------------------------------------------------
   Total Runs:              5
   Average Latency:         311.2ms
   Average Input Length:    114 characters
   Average Output Length:   73 characters

🌍 LANGUAGE DISTRIBUTION
----------------------------------------------------------------------
   DE: 3 runs (60.0%)
   EN: 2 runs (40.0%)

📊 SIMPLIFICATION LEVEL DISTRIBUTION
----------------------------------------------------------------------
   easy: 5 runs (100.0%)

🤖 MODEL USAGE
----------------------------------------------------------------------
   llama-3.1-8b-instant: 5 runs (100.0%)

✨ QUALITY SCORES (Averages)
----------------------------------------------------------------------
   avg_avg_sentence_len: 11.37
   avg_sentence_count: 1.8
   avg_word_count: 12.0

⚡ PERFORMANCE BY LANGUAGE
----------------------------------------------------------------------
   DE: avg=260.0ms, min=249ms, max=267ms
   EN: avg=388.0ms, min=333ms, max=443ms
```

---

## 🔄 Automated Reporting

### Option 1: Run Once
```bash
python generate_api_report.py --output data/logs/reports/report_$(date +%Y%m%d).txt
```

### Option 2: Schedule with Cron
Add to crontab:
```bash
# Generate report every day at 9 AM
0 9 * * * cd /path/to/klartext/services/api && python generate_api_report.py --output ../../data/logs/reports/daily_$(date +\%Y\%m\%d).txt
```

### Option 3: Schedule with launchd (macOS)
See: `scripts/setup_metrics_scheduler.sh` for demo logging scheduler example

---

## 🚀 Live Production Logs

If your API is deployed on Fly.io, check production logs:

```bash
# SSH into production server
flyctl ssh console --app klartext-api

# View logs
cat /app/data/logs/api_runs.jsonl | tail -20

# Count entries
wc -l /app/data/logs/api_runs.jsonl

# Check file size
du -h /app/data/logs/api_runs.jsonl
```

---

## 🛠️ Troubleshooting

### No logs appearing?

1. **Check log file exists**:
   ```bash
   ls -lh data/logs/api_runs.jsonl
   ```

2. **Check permissions**:
   ```bash
   chmod 755 data/logs/
   ```

3. **Test logging manually**:
   ```bash
   python test_logging.py
   ```

4. **Check frontend is calling the logger**:
   - Open browser DevTools → Network tab
   - Look for POST to `/v1/log-run` after simplification
   - Check console for any errors

### Empty statistics?

If you see `Total Runs: 0`, it means no logs have been collected yet. Either:
- The app hasn't been used yet
- The frontend isn't calling the logger
- There's an error in the logging pipeline

Run the test suite to verify everything works:
```bash
python test_logging.py
```

---

## 📚 Full Documentation

- **Complete Guide**: `LOGGING_GUIDE.md` (comprehensive 1200-line guide)
- **Implementation Details**: `LOGGING_IMPLEMENTATION.md`
- **API Docs**: `README.md` (logging section)

---

**Status**: ✅ Fully Operational
**Last Updated**: February 2, 2026
