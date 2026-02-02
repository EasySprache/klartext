# Automatic Metrics Scheduler

This directory contains scripts to automatically generate metrics reports every 48 hours.

## Quick Setup

Run the automated setup script from the project root:

```bash
chmod +x scripts/setup_metrics_scheduler.sh
./scripts/setup_metrics_scheduler.sh
```

The script will:
1. Auto-detect your project root directory
2. Auto-detect your Python 3 interpreter
3. Generate a plist with correct paths for your machine
4. Install a macOS launchd service
5. Run the first report immediately
6. Schedule reports every 48 hours automatically

## Manual Setup (if needed)

If you prefer manual installation:

```bash
# Generate plist from template
sed -e "s|{{PROJECT_ROOT}}|$(pwd)|g" \
    -e "s|{{PYTHON_PATH}}|$(which python3)|g" \
    -e "s|{{PYTHON_DIR}}|$(dirname $(which python3))|g" \
    scripts/com.klartext.metrics.plist > ~/Library/LaunchAgents/com.klartext.metrics.plist

# Load the service
launchctl load ~/Library/LaunchAgents/com.klartext.metrics.plist
```

## Where Reports Are Saved

All reports are saved to a single file with newest on top:
```
data/logs/metrics_overview.txt
```

Individual timestamped reports are also saved to:
```
data/logs/reports/metrics_report_YYYYMMDD_HHMMSS.txt
```

## Management

### Check if service is running
```bash
launchctl list | grep klartext
```

### Stop the service
```bash
launchctl unload ~/Library/LaunchAgents/com.klartext.metrics.plist
```

### Start the service
```bash
launchctl load ~/Library/LaunchAgents/com.klartext.metrics.plist
```

### Remove the service completely
```bash
launchctl unload ~/Library/LaunchAgents/com.klartext.metrics.plist
rm ~/Library/LaunchAgents/com.klartext.metrics.plist
```

### View logs
```bash
# Output log
tail -f data/logs/metrics_scheduler.log

# Error log
tail -f data/logs/metrics_scheduler_error.log
```

## Run Report Manually

To generate a report immediately without waiting:

```bash
# From project root
python scripts/run_scheduled_metrics.py --run-once
```

## Troubleshooting

### Service not running
Check the error log:
```bash
cat data/logs/metrics_scheduler_error.log
```

### Python not found
Ensure Python 3 is in your PATH, then re-run setup:
```bash
which python3  # Verify Python is accessible
./scripts/setup_metrics_scheduler.sh  # Re-run setup to regenerate plist
```

### Permissions error
Ensure the scripts are executable:
```bash
chmod +x scripts/run_scheduled_metrics.py
chmod +x scripts/setup_metrics_scheduler.sh
```

## Schedule Details

- **Interval**: Every 48 hours (172800 seconds)
- **Run on load**: Yes (runs immediately when service starts)
- **Working directory**: Auto-detected project root
- **Python**: Auto-detected from your PATH

## Files

| File | Purpose |
|------|---------|
| `run_scheduled_metrics.py` | Main script that generates reports |
| `com.klartext.metrics.plist` | Template for macOS launchd service (uses `{{placeholders}}`) |
| `setup_metrics_scheduler.sh` | Automated installation script with path auto-detection |
| `metrics_reporter.py` | Core metrics analysis library |

## Portability

The setup is fully portable across machines:
- The plist file uses `{{placeholders}}` that are substituted at installation time
- `setup_metrics_scheduler.sh` auto-detects project root and Python paths
- No hardcoded machine-specific paths in version control

## Thread Safety

The reporting system is safe for concurrent access:
- Uses `fcntl` file locking to prevent race conditions
- Multiple processes can safely call `run_scheduled_metrics.py` simultaneously
- Read-modify-write operations are atomic via exclusive locks

---

*Last updated: 2026-01-23*
