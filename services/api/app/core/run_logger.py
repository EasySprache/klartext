"""
KlarText API Run Logger
=======================
Logs simplification runs to JSONL file for feedback loop and analytics.

Key features:
- Stores full input and output text for quality review
- Optimized for production use with file locking
- Aligns with feedback loop architecture
"""

import os
import json
import fcntl
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# =============================================================================
# Configuration
# =============================================================================

def get_log_file_path() -> Path:
    """Get the log file path from environment or use default."""
    log_path_str = os.getenv("LOG_FILE_PATH", "./data/logs/api_runs.jsonl")
    log_path = Path(log_path_str)
    
    # Ensure directory exists
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    return log_path


# =============================================================================
# Logging Functions
# =============================================================================


def write_log_entry(
    run_id: str,
    input_text: str,
    output_text: str,
    target_lang: str,
    level: str,
    model_used: str,
    latency_ms: int,
    chunk_count: int = 1,
    scores: Optional[dict] = None,
    warnings: Optional[list[str]] = None,
    user_feedback: Optional[str] = None,
    timestamp: Optional[str] = None,
    log_file: Optional[Path] = None
) -> dict:
    """
    Write a log entry to the JSONL file with file locking.
    
    Args:
        run_id: Unique identifier for this run (UUID recommended)
        input_text: Original input text
        output_text: Simplified output text
        target_lang: Target language (de/en)
        level: Simplification level (very_easy/easy/medium)
        model_used: Model identifier (e.g., llama-3.1-8b-instant)
        latency_ms: End-to-end processing time in milliseconds
        chunk_count: Number of chunks input was split into (default: 1)
        scores: Quality scores dict (e.g., {"lix": 37.3, "avg_sentence_len": 12.0})
        warnings: List of warning strings
        user_feedback: Optional user feedback (thumbs_up/thumbs_down/flag)
        timestamp: ISO 8601 timestamp (auto-generated if not provided)
        log_file: Path to log file (uses default if not provided)
    
    Returns:
        The complete log entry that was written
    """
    # Use default log file if not specified
    if log_file is None:
        log_file = get_log_file_path()
    
    # Generate timestamp if not provided
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    # Build log entry
    entry = {
        "run_id": run_id,
        "timestamp": timestamp,
        "input_text": input_text,
        "output_text": output_text,
        "input_length": len(input_text),
        "output_length": len(output_text),
        "target_lang": target_lang,
        "level": level,
        "model_used": model_used,
        "latency_ms": latency_ms,
        "chunk_count": chunk_count,
        "scores": scores or {},
        "warnings": warnings or [],
        "user_feedback": user_feedback,
    }
    
    # Write to file with file locking to prevent concurrent write issues
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            # Acquire exclusive lock
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                f.flush()  # Ensure written to disk
            finally:
                # Release lock
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except Exception as e:
        # Log errors but don't crash the app
        print(f"Error writing log entry: {e}")
        raise
    
    return entry


def load_all_logs(log_file: Optional[Path] = None) -> list[dict]:
    """
    Load all log entries from the JSONL file.
    
    Args:
        log_file: Path to log file (uses default if not provided)
    
    Returns:
        List of log entry dicts
    """
    if log_file is None:
        log_file = get_log_file_path()
    
    if not log_file.exists():
        return []
    
    logs = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue
    
    return logs


def compute_aggregate_stats(log_file: Optional[Path] = None) -> dict:
    """
    Compute aggregate statistics across all logged runs.
    
    Args:
        log_file: Path to log file (uses default if not provided)
    
    Returns:
        Dictionary with aggregate statistics
    """
    logs = load_all_logs(log_file)
    
    if not logs:
        return {
            "total_runs": 0,
            "avg_latency_ms": 0,
            "avg_input_length": 0,
            "avg_output_length": 0,
            "languages": {},
            "levels": {},
            "models": {}
        }
    
    # Aggregate metrics
    total_latency = sum(log.get("latency_ms", 0) for log in logs)
    total_input_length = sum(log.get("input_length", 0) for log in logs)
    total_output_length = sum(log.get("output_length", 0) for log in logs)
    
    # Count by language
    languages = {}
    for log in logs:
        lang = log.get("target_lang", "unknown")
        languages[lang] = languages.get(lang, 0) + 1
    
    # Count by level
    levels = {}
    for log in logs:
        level = log.get("level", "unknown")
        levels[level] = levels.get(level, 0) + 1
    
    # Count by model
    models = {}
    for log in logs:
        model = log.get("model_used", "unknown")
        models[model] = models.get(model, 0) + 1
    
    # Aggregate scores if available
    avg_scores = {}
    scores_list = [log.get("scores", {}) for log in logs if log.get("scores")]
    if scores_list:
        # Get all score keys
        all_keys = set()
        for scores in scores_list:
            all_keys.update(scores.keys())
        
        # Average each score
        for key in all_keys:
            values = [s[key] for s in scores_list if key in s and isinstance(s[key], (int, float))]
            if values:
                avg_scores[f"avg_{key}"] = round(sum(values) / len(values), 2)
    
    return {
        "total_runs": len(logs),
        "avg_latency_ms": round(total_latency / len(logs), 1) if logs else 0,
        "avg_input_length": round(total_input_length / len(logs), 1) if logs else 0,
        "avg_output_length": round(total_output_length / len(logs), 1) if logs else 0,
        "languages": languages,
        "levels": levels,
        "models": models,
        "avg_scores": avg_scores
    }


# =============================================================================
# Helper Functions
# =============================================================================

def create_run_log_from_simplification(
    run_id: str,
    input_text: str,
    output_text: str,
    target_lang: str,
    level: str,
    model_used: str,
    latency_ms: int,
    chunk_count: int = 1,
    warnings: Optional[list[str]] = None,
    scores: Optional[dict] = None,
    user_feedback: Optional[str] = None
) -> dict:
    """
    Convenience function to create and write a log entry from simplification data.
    
    Args:
        run_id: Unique run identifier
        input_text: Original input text
        output_text: Simplified output text
        target_lang: Target language
        level: Simplification level
        model_used: Model identifier
        latency_ms: Processing time in milliseconds
        chunk_count: Number of chunks
        warnings: List of warnings
        scores: Quality scores
        user_feedback: User feedback
    
    Returns:
        The log entry that was written
    """
    return write_log_entry(
        run_id=run_id,
        input_text=input_text,
        output_text=output_text,
        target_lang=target_lang,
        level=level,
        model_used=model_used,
        latency_ms=latency_ms,
        chunk_count=chunk_count,
        scores=scores,
        warnings=warnings,
        user_feedback=user_feedback
    )
