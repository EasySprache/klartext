#!/usr/bin/env python3
"""
KlarText API Logging Report Generator
======================================
Generates formatted reports from API run logs.

Usage:
    python generate_api_report.py                 # Print to console
    python generate_api_report.py --output file   # Save to file
    python generate_api_report.py --json          # Output as JSON
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.run_logger import load_all_logs, compute_aggregate_stats, get_log_file_path


def generate_text_report(stats: dict, logs: list[dict]) -> str:
    """Generate a formatted text report from statistics."""
    
    lines = []
    separator = "=" * 70
    
    # Header
    lines.append(separator)
    lines.append("📊 KLARTEXT API LOGGING REPORT")
    lines.append(separator)
    
    # Check if we have data
    if stats["total_runs"] == 0:
        lines.append("No log entries found.")
        lines.append(separator)
        return "\n".join(lines)
    
    # Report timestamp
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines.append(f"Generated: {now}")
    lines.append(f"Log File: {get_log_file_path()}")
    lines.append("")
    
    # Summary statistics
    lines.append("📈 SUMMARY STATISTICS")
    lines.append("-" * 70)
    lines.append(f"   Total Runs:              {stats['total_runs']}")
    lines.append(f"   Average Latency:         {stats['avg_latency_ms']:.1f}ms")
    lines.append(f"   Average Input Length:    {stats['avg_input_length']:.0f} characters")
    lines.append(f"   Average Output Length:   {stats['avg_output_length']:.0f} characters")
    lines.append("")
    
    # Language distribution
    lines.append("🌍 LANGUAGE DISTRIBUTION")
    lines.append("-" * 70)
    for lang, count in sorted(stats['languages'].items(), key=lambda x: -x[1]):
        percentage = (count / stats['total_runs']) * 100
        lines.append(f"   {lang.upper()}: {count} runs ({percentage:.1f}%)")
    lines.append("")
    
    # Level distribution
    lines.append("📊 SIMPLIFICATION LEVEL DISTRIBUTION")
    lines.append("-" * 70)
    for level, count in sorted(stats['levels'].items(), key=lambda x: -x[1]):
        percentage = (count / stats['total_runs']) * 100
        lines.append(f"   {level}: {count} runs ({percentage:.1f}%)")
    lines.append("")
    
    # Model usage
    lines.append("🤖 MODEL USAGE")
    lines.append("-" * 70)
    for model, count in sorted(stats['models'].items(), key=lambda x: -x[1]):
        percentage = (count / stats['total_runs']) * 100
        lines.append(f"   {model}: {count} runs ({percentage:.1f}%)")
    lines.append("")
    
    # Quality scores (if available)
    if stats.get('avg_scores'):
        lines.append("✨ QUALITY SCORES (Averages)")
        lines.append("-" * 70)
        for score_name, score_value in sorted(stats['avg_scores'].items()):
            lines.append(f"   {score_name}: {score_value}")
        lines.append("")
    
    # Performance breakdown by language
    lines.append("⚡ PERFORMANCE BY LANGUAGE")
    lines.append("-" * 70)
    lang_performance = {}
    for log in logs:
        lang = log['target_lang']
        if lang not in lang_performance:
            lang_performance[lang] = []
        lang_performance[lang].append(log['latency_ms'])
    
    for lang in sorted(lang_performance.keys()):
        latencies = lang_performance[lang]
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        lines.append(f"   {lang.upper()}: avg={avg_latency:.1f}ms, min={min_latency}ms, max={max_latency}ms")
    lines.append("")
    
    # Recent runs
    lines.append("📝 RECENT RUNS (Last 5)")
    lines.append("-" * 70)
    for i, log in enumerate(logs[-5:], 1):
        timestamp = log.get('timestamp', 'N/A')
        lines.append(f"{i}. {timestamp}")
        lines.append(f"   Run ID: {log['run_id']}")
        lines.append(f"   Language: {log['target_lang']} | Level: {log.get('level', 'N/A')} | Latency: {log['latency_ms']}ms")
        lines.append(f"   Input: {log['input_text'][:60]}...")
        lines.append(f"   Output: {log['output_text'][:60]}...")
        if log.get('warnings'):
            lines.append(f"   ⚠️  Warnings: {', '.join(log['warnings'])}")
        lines.append("")
    
    lines.append(separator)
    lines.append("Report generated successfully!")
    lines.append(separator)
    
    return "\n".join(lines)


def generate_json_report(stats: dict, logs: list[dict]) -> dict:
    """Generate a JSON-serializable report."""
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    # Performance by language
    lang_performance = {}
    for log in logs:
        lang = log['target_lang']
        if lang not in lang_performance:
            lang_performance[lang] = []
        lang_performance[lang].append(log['latency_ms'])
    
    lang_stats = {}
    for lang, latencies in lang_performance.items():
        lang_stats[lang] = {
            "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
            "min_latency_ms": min(latencies),
            "max_latency_ms": max(latencies),
            "count": len(latencies)
        }
    
    return {
        "report_timestamp": now,
        "log_file": str(get_log_file_path()),
        "summary": {
            "total_runs": stats["total_runs"],
            "avg_latency_ms": stats["avg_latency_ms"],
            "avg_input_length": stats["avg_input_length"],
            "avg_output_length": stats["avg_output_length"],
        },
        "distributions": {
            "languages": stats["languages"],
            "levels": stats["levels"],
            "models": stats["models"],
        },
        "quality_scores": stats.get("avg_scores", {}),
        "performance_by_language": lang_stats,
        "recent_runs": [
            {
                "run_id": log["run_id"],
                "timestamp": log.get("timestamp"),
                "language": log["target_lang"],
                "level": log.get("level"),
                "latency_ms": log["latency_ms"],
                "input_preview": log["input_text"][:100],
                "output_preview": log["output_text"][:100],
                "warnings": log.get("warnings", [])
            }
            for log in logs[-10:]  # Last 10 runs
        ]
    }


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description="Generate API logging report from run logs."
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
    
    args = parser.parse_args()
    
    # Load logs
    logs = load_all_logs()
    stats = compute_aggregate_stats()
    
    # Generate report
    if args.json:
        report = generate_json_report(stats, logs)
        output = json.dumps(report, indent=2, ensure_ascii=False)
    else:
        output = generate_text_report(stats, logs)
    
    # Print to console
    print(output)
    
    # Save to file if requested
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"\n[Report saved to {args.output}]")


if __name__ == "__main__":
    main()
