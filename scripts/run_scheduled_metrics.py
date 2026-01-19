#!/usr/bin/env python3
"""
KlarText Scheduled Metrics Reporter
====================================
Runs the metrics overview report automatically every 48 hours.

Usage:
    # Run in foreground (for testing):
    python scripts/run_scheduled_metrics.py

    # Run in background (production):
    nohup python scripts/run_scheduled_metrics.py > metrics_scheduler.log 2>&1 &

    # Or use with systemd/launchd for persistent scheduling

Options:
    --interval HOURS   Set custom interval (default: 48)
    --output-dir DIR   Directory to save reports (default: data/logs/reports)
    --console-only     Only print to console, don't save files
    --run-once         Run once immediately and exit (for cron jobs)
    --json             Output reports as JSON
"""

import argparse
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.metrics_reporter import run_report, DEFAULT_LOG_FILE

# Default configuration
DEFAULT_INTERVAL_HOURS = 48
PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "logs" / "reports"
DEFAULT_OVERVIEW_FILE = PROJECT_ROOT / "data" / "logs" / "metrics_overview.txt"

# Global flag for graceful shutdown
_running = True


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _running
    print(f"\n[{datetime.now()}] Received shutdown signal. Stopping scheduler...")
    _running = False


def generate_report_filename(output_dir: Path, json_format: bool = False) -> Path:
    """Generate a timestamped filename for the report."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    extension = "json" if json_format else "txt"
    return output_dir / f"metrics_report_{timestamp}.{extension}"


def append_to_overview_file(
    overview_file: Path,
    report_text: str,
    interval_hours: float = DEFAULT_INTERVAL_HOURS
):
    """Append a report to the consolidated overview file.
    
    Creates a readable, chronological log of all 48-hour reports.
    """
    overview_file.parent.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    # Create header for this report entry
    header = f"""
{'#' * 70}
#  48-HOUR METRICS REPORT
#  Generated: {timestamp}
#  Interval: Every {interval_hours} hours
{'#' * 70}

"""
    
    # Append to file
    with open(overview_file, "a", encoding="utf-8") as f:
        f.write(header)
        f.write(report_text)
        f.write("\n\n")


def run_scheduled_report(
    interval_hours: float = DEFAULT_INTERVAL_HOURS,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    overview_file: Path = DEFAULT_OVERVIEW_FILE,
    console_only: bool = False,
    run_once: bool = False,
    json_format: bool = False,
    log_file: Path = DEFAULT_LOG_FILE
):
    """Run metrics reports on a schedule.
    
    Args:
        interval_hours: Hours between reports (default: 48)
        output_dir: Directory to save individual report files
        overview_file: Path to consolidated overview file (appended to)
        console_only: If True, don't save files
        run_once: Run once and exit (for cron jobs)
        json_format: Output as JSON
        log_file: Path to demo logs JSONL file
    """
    global _running
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Ensure output directory exists
    if not console_only:
        output_dir.mkdir(parents=True, exist_ok=True)
        overview_file.parent.mkdir(parents=True, exist_ok=True)
    
    interval_seconds = interval_hours * 3600
    
    print("=" * 60)
    print("📊 KlarText Scheduled Metrics Reporter")
    print("=" * 60)
    print(f"Started: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Interval: {interval_hours} hours ({interval_seconds} seconds)")
    print(f"Log file: {log_file}")
    if not console_only:
        print(f"Output dir: {output_dir}")
        print(f"Overview file: {overview_file}")
    print(f"Mode: {'Run once' if run_once else 'Continuous'}")
    print("=" * 60)
    print()
    
    iteration = 0
    
    while _running:
        iteration += 1
        
        try:
            print(f"\n[{datetime.now()}] Running metrics report (iteration {iteration})...")
            print("-" * 60)
            
            # Determine output file for individual report
            output_file = None
            if not console_only:
                output_file = generate_report_filename(output_dir, json_format)
            
            # Run the report
            stats = run_report(
                log_file=log_file,
                output_file=output_file,
                output_json=json_format,
                include_breakdown=True,
                quiet=False
            )
            
            # Also append to the consolidated overview file (text format only)
            if not console_only and not json_format:
                # Generate a clean text report for the overview file
                from scripts.metrics_reporter import generate_text_report, load_all_logs, compute_aggregate_stats
                logs = load_all_logs(log_file)
                overview_report = generate_text_report(
                    stats, logs, 
                    include_breakdown=True, 
                    title=f"48-HOUR METRICS REPORT (Run #{iteration})",
                    use_color=False  # No ANSI colors in file
                )
                append_to_overview_file(overview_file, overview_report, interval_hours)
                print(f"[Appended to overview: {overview_file}]")
            
            # Log summary
            total = stats.get("total_entries", 0)
            pass_rate = stats.get("guardrails_summary", {}).get("pass_rate", 0)
            print(f"\n[{datetime.now()}] Report complete: {total} entries, {pass_rate:.1f}% pass rate")
            
            if output_file:
                print(f"[Saved to: {output_file}]")
            
        except Exception as e:
            print(f"\n[{datetime.now()}] ERROR generating report: {e}")
            import traceback
            traceback.print_exc()
        
        # Exit if run_once mode
        if run_once:
            print(f"\n[{datetime.now()}] Run-once mode: Exiting after single report.")
            break
        
        # Wait for next iteration
        print(f"\n[{datetime.now()}] Next report in {interval_hours} hours...")
        print("(Press Ctrl+C to stop)")
        
        # Sleep in small increments to allow graceful shutdown
        sleep_end = time.time() + interval_seconds
        while _running and time.time() < sleep_end:
            time.sleep(min(60, sleep_end - time.time()))  # Check every minute
    
    print(f"\n[{datetime.now()}] Scheduler stopped.")


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description="Run metrics reports on a schedule (every 48 hours by default)."
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL_HOURS,
        help=f"Hours between reports (default: {DEFAULT_INTERVAL_HOURS})"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory to save individual reports (default: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        "--overview-file",
        type=Path,
        default=DEFAULT_OVERVIEW_FILE,
        help=f"Consolidated overview file (appended to, default: {DEFAULT_OVERVIEW_FILE})"
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        default=DEFAULT_LOG_FILE,
        help="Path to demo logs JSONL file"
    )
    parser.add_argument(
        "--console-only",
        action="store_true",
        help="Only print to console, don't save files"
    )
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Run once immediately and exit (useful for cron jobs)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output reports as JSON"
    )
    
    args = parser.parse_args()
    
    run_scheduled_report(
        interval_hours=args.interval,
        output_dir=args.output_dir,
        overview_file=args.overview_file,
        log_file=args.log_file,
        console_only=args.console_only,
        run_once=args.run_once,
        json_format=args.json
    )


if __name__ == "__main__":
    main()
