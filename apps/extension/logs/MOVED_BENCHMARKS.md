# Benchmark Files Moved

**Date:** January 19, 2026

The following benchmark files have been **moved** from this directory to the project-wide data directory for better discoverability and project-wide reference:

## Moved Files

```
apps/extension/logs/klartext_benchmark_v1.json
  → data/benchmarks/v1/klartext_benchmark_v1.json

apps/extension/logs/klartext_combined_chunks.json
  → data/benchmarks/v1/klartext_combined_chunks.json

apps/extension/logs/klartext_benchmark_v1_txt/
  → data/benchmarks/v1/outputs/
```

## New Location

All benchmark files are now located at:
- **`data/benchmarks/v1/`**

See `data/benchmarks/README.md` for full documentation.

## What Stays Here

This `apps/extension/logs/` directory now contains only:
- Transient test runs: `klartext-results-*.json` (timestamped experiments)
- Extension-specific debug logs
- Files intended to be regenerated or deleted regularly

## Why the Move?

Benchmark datasets are canonical evaluation data used across the entire project (notebooks, API, demo). Moving them to `data/benchmarks/` improves:
- Discoverability
- Version control
- Integration with notebooks
- Clear semantic separation (logs vs. datasets)
