#!/usr/bin/env python3
"""
KlarText Metrics Reporter
=========================
Generates formatted metrics overview reports from demo output logs.

Usage:
    python scripts/metrics_reporter.py                # Print to console
    python scripts/metrics_reporter.py --output file  # Save to file
    python scripts/metrics_reporter.py --json         # Output as JSON

The report includes:
- Running averages for key readability metrics
- Guardrails pass rate summary
- Optional breakdown by model and language
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from demo.demo_logger import load_all_logs, compute_aggregate_stats, DEFAULT_LOG_FILE

# -----------------------------------------------------------------------------
# ANSI Color Codes for Terminal Output
# -----------------------------------------------------------------------------

class Colors:
    """ANSI color codes for terminal output."""
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RESET = "\033[0m"
    BOLD = "\033[1m"
    
    @classmethod
    def is_terminal(cls) -> bool:
        """Check if output is going to a terminal (supports colors)."""
        return hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()


# Guardrail thresholds for each metric
# Format: (threshold_value, comparison_operator)
# "le" = less than or equal (value ≤ threshold is OK)
# "ge" = greater than or equal (value ≥ threshold is OK)
GUARDRAIL_THRESHOLDS = {
    "avg_sentence_len_words": (15, "le"),   # ≤ 15 is OK
    "pct_sentences_gt20": (10, "le"),        # ≤ 10% is OK
    "ari_score": (8, "le"),                  # ≤ 8 is OK
    "meaning_cosine": (0.70, "ge"),          # ≥ 0.70 is OK
}


def check_guardrail_violation(metric_name: str, value: float) -> bool:
    """Check if a metric value violates its guardrail.
    
    Returns:
        True if the metric VIOLATES the guardrail (bad), False if OK.
    """
    if metric_name not in GUARDRAIL_THRESHOLDS:
        return False
    
    threshold, operator = GUARDRAIL_THRESHOLDS[metric_name]
    
    if operator == "le":
        return value > threshold  # Violation if > threshold
    elif operator == "ge":
        return value < threshold  # Violation if < threshold
    
    return False


def colorize(text: str, color: str, use_color: bool = True) -> str:
    """Apply ANSI color to text if colors are enabled."""
    if use_color and Colors.is_terminal():
        return f"{color}{text}{Colors.RESET}"
    return text


def generate_text_report(
    stats: dict,
    logs: list[dict],
    include_breakdown: bool = False,
    title: str = "DEMO METRICS OVERVIEW",
    use_color: bool = True
) -> str:
    """Generate a formatted text report from statistics.
    
    Args:
        stats: Aggregate statistics dictionary
        logs: List of log entries
        include_breakdown: Include breakdown by model/language
        title: Report title
        use_color: Enable ANSI color codes for terminal output
    """
    
    lines = []
    separator = "=" * 60
    
    # Header
    lines.append(separator)
    lines.append(f"📈 {title}")
    lines.append(separator)
    
    # Check if we have data
    if stats["total_entries"] == 0:
        lines.append("No log entries found.")
        lines.append(separator)
        return "\n".join(lines)
    
    # Report timestamp
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines.append(f"Generated: {now}")
    lines.append(f"Total Entries: {stats['total_entries']}")
    lines.append("")
    
    # Averages section
    lines.append("📊 AVERAGES (Running Statistics)")
    lines.append("-" * 40)
    
    avg_metrics = stats.get("avg_metrics", {})
    metric_display = {
        "avg_avg_sentence_len_words": "avg_sentence_len_words",
        "avg_pct_sentences_gt20": "pct_sentences_gt20",
        "avg_ari_score": "ari_score",
        "avg_meaning_cosine": "meaning_cosine",
    }
    
    for key, display_name in metric_display.items():
        if key in avg_metrics:
            value = avg_metrics[key]
            value_str = f"{value:.2f}"
            
            # Check if this metric violates its guardrail
            if check_guardrail_violation(display_name, value):
                # Color the value red and add warning indicator
                value_str = colorize(f"{value:.2f} ⚠", Colors.RED, use_color)
            else:
                # Color the value green (passing)
                value_str = colorize(f"{value:.2f} ✓", Colors.GREEN, use_color)
            
            lines.append(f"   {display_name}: {value_str}")
    
    # Add legend for colors
    if use_color and Colors.is_terminal():
        lines.append("")
        lines.append(f"   Legend: {colorize('✓ passes guardrail', Colors.GREEN, use_color)} | {colorize('⚠ violates guardrail', Colors.RED, use_color)}")
    
    lines.append("")
    
    # Guardrails summary
    guardrails = stats.get("guardrails_summary", {})
    total_passed = guardrails.get("total_passed", 0)
    total_checks = guardrails.get("total_checks", 0)
    pass_rate = guardrails.get("pass_rate", 0)
    
    # Status emoji based on pass rate
    if pass_rate >= 90:
        status_emoji = "✅"
    elif pass_rate >= 70:
        status_emoji = "⚠️"
    else:
        status_emoji = "❌"
    
    lines.append(f"{status_emoji} Guardrails Pass Rate: {pass_rate:.1f}%")
    lines.append(f"   ({total_passed}/{total_checks} checks passed)")
    
    # Show failure counts if any
    failure_counts = guardrails.get("failure_counts", {})
    if failure_counts:
        lines.append("")
        lines.append("   Failed guardrails breakdown:")
        for guardrail_name, count in sorted(failure_counts.items(), key=lambda x: -x[1]):
            lines.append(f"     - {guardrail_name}: {count} failures")
    
    # Optional breakdown by model/language
    if include_breakdown and logs:
        lines.append("")
        lines.append("-" * 40)
        lines.append("📋 BREAKDOWN BY MODEL")
        
        models = {}
        for log in logs:
            model = log.get("model", "unknown")
            if model not in models:
                models[model] = []
            models[model].append(log)
        
        for model, model_logs in models.items():
            model_stats = compute_aggregate_stats(model_logs)
            model_gr = model_stats.get("guardrails_summary", {})
            lines.append(f"   {model}: {len(model_logs)} entries, {model_gr.get('pass_rate', 0):.1f}% pass rate")
        
        lines.append("")
        lines.append("📋 BREAKDOWN BY LANGUAGE")
        
        languages = {}
        for log in logs:
            lang = log.get("language", "unknown")
            if lang not in languages:
                languages[lang] = []
            languages[lang].append(log)
        
        for lang, lang_logs in languages.items():
            lang_stats = compute_aggregate_stats(lang_logs)
            lang_gr = lang_stats.get("guardrails_summary", {})
            lines.append(f"   {lang}: {len(lang_logs)} entries, {lang_gr.get('pass_rate', 0):.1f}% pass rate")
    
    lines.append(separator)
    
    return "\n".join(lines)


def generate_json_report(stats: dict, logs: list[dict]) -> dict:
    """Generate a JSON-serializable report."""
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    return {
        "report_timestamp": now,
        "total_entries": stats["total_entries"],
        "avg_metrics": stats.get("avg_metrics", {}),
        "guardrails_summary": stats.get("guardrails_summary", {}),
        "breakdown": {
            "by_model": _compute_breakdown(logs, "model"),
            "by_language": _compute_breakdown(logs, "language"),
        }
    }


def _compute_breakdown(logs: list[dict], key: str) -> dict:
    """Compute statistics breakdown by a given key."""
    groups = {}
    for log in logs:
        group = log.get(key, "unknown")
        if group not in groups:
            groups[group] = []
        groups[group].append(log)
    
    breakdown = {}
    for group, group_logs in groups.items():
        group_stats = compute_aggregate_stats(group_logs)
        breakdown[group] = {
            "count": len(group_logs),
            "pass_rate": group_stats.get("guardrails_summary", {}).get("pass_rate", 0),
            "avg_metrics": group_stats.get("avg_metrics", {})
        }
    
    return breakdown


def run_report(
    log_file: Path = DEFAULT_LOG_FILE,
    output_file: Optional[Path] = None,
    output_json: bool = False,
    include_breakdown: bool = False,
    quiet: bool = False,
    use_color: bool = True
) -> dict:
    """Run the metrics report and return statistics.
    
    Args:
        log_file: Path to the JSONL log file
        output_file: Optional path to save report (None = print only)
        output_json: Output as JSON instead of text
        include_breakdown: Include breakdown by model/language
        quiet: Suppress console output
        use_color: Enable colored output for terminal
    
    Returns:
        Statistics dictionary
    """
    logs = load_all_logs(log_file)
    stats = compute_aggregate_stats(logs)
    
    if output_json:
        report = generate_json_report(stats, logs)
        output = json.dumps(report, indent=2, ensure_ascii=False)
    else:
        # Disable colors when writing to file (ANSI codes don't render in files)
        file_color = use_color and output_file is None
        report = generate_text_report(stats, logs, include_breakdown, use_color=file_color)
        output = report
    
    if not quiet:
        print(output)
    
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(output)
        if not quiet:
            print(f"\n[Report saved to {output_file}]")
    
    return stats


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description="Generate metrics overview report from demo output logs."
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        default=DEFAULT_LOG_FILE,
        help="Path to the JSONL log file"
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=None,
        help="Save report to file (optional)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON instead of text"
    )
    parser.add_argument(
        "--breakdown", "-b",
        action="store_true",
        help="Include breakdown by model and language"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress console output (useful with --output)"
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable colored output"
    )
    
    args = parser.parse_args()
    
    run_report(
        log_file=args.log_file,
        output_file=args.output,
        output_json=args.json,
        include_breakdown=args.breakdown,
        quiet=args.quiet,
        use_color=not args.no_color
    )


if __name__ == "__main__":
    main()
