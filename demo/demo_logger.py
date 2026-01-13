"""
KlarText Demo Output Logger
===========================
Logs each simplification output to a JSONL file with metrics and guardrails.

Usage in demo/app.py:
    from demo_logger import log_simplification
    
    # After successful simplification:
    log_simplification(
        source_text=input_text,
        output_text=simplified_text,
        model=GROQ_MODEL,
        template=template_filename,
        language=target_lang
    )
"""

import os
import re
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Default log file location
PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_LOG_FILE = PROJECT_ROOT / "data" / "logs" / "demo_outputs.jsonl"

# Ensure directory exists
DEFAULT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# Text Processing Utilities
# -----------------------------------------------------------------------------

def split_sentences(text: str) -> list[str]:
    """Split text into sentences, handling common abbreviations."""
    text_clean = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|e\.g|i\.e)\.\s', r'\1_DOT ', text)
    text_clean = re.sub(r'\b(z\.B|d\.h|usw|ggfs)\.\s', r'\1_DOT ', text_clean)
    sentences = re.split(r'[.!?]+\s+', text_clean.strip())
    return [s.strip() for s in sentences if s.strip()]


def get_words(text: str) -> list[str]:
    """Extract words from text, handling German characters."""
    return re.findall(r'[A-Za-zÄÖÜäöüßéèêëàâáîïíôöóûüú]+', text)

# -----------------------------------------------------------------------------
# Metrics Computation
# -----------------------------------------------------------------------------

def compute_ari_score(text: str) -> float:
    """
    Compute Automated Readability Index.
    ARI = 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
    Lower scores = easier to read.
    """
    sentences = split_sentences(text)
    words = get_words(text)
    
    if not sentences or not words:
        return 0.0
    
    char_count = sum(len(w) for w in words)
    word_count = len(words)
    sentence_count = len(sentences)
    
    ari = 4.71 * (char_count / word_count) + 0.5 * (word_count / sentence_count) - 21.43
    return round(max(0, ari), 2)


def compute_meaning_cosine(source: str, output: str) -> float:
    """Compute TF-IDF cosine similarity for meaning preservation."""
    if not SKLEARN_AVAILABLE:
        return 0.0
    try:
        vectorizer = TfidfVectorizer(lowercase=True)
        tfidf_matrix = vectorizer.fit_transform([source, output])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(similarity, 3)
    except Exception:
        return 0.0


def compute_metrics(source_text: str, output_text: str) -> dict:
    """
    Compute all metrics for a simplification output.
    
    Returns:
        dict with metrics:
        - avg_sentence_len_words: Average words per sentence
        - pct_sentences_gt20: Percentage of sentences > 20 words
        - ari_score: Automated Readability Index
        - meaning_cosine: TF-IDF similarity (meaning preservation)
    """
    sentences = split_sentences(output_text)
    words = get_words(output_text)
    
    if not sentences or not words:
        return {
            "avg_sentence_len_words": 0.0,
            "pct_sentences_gt20": 0.0,
            "ari_score": 0.0,
            "meaning_cosine": 0.0
        }
    
    sent_lengths = [len(get_words(s)) for s in sentences]
    avg_sent_len = sum(sent_lengths) / len(sentences)
    long_sents = sum(1 for length in sent_lengths if length > 20)
    pct_long = (long_sents / len(sentences)) * 100
    
    return {
        "avg_sentence_len_words": round(avg_sent_len, 1),
        "pct_sentences_gt20": round(pct_long, 1),
        "ari_score": compute_ari_score(output_text),
        "meaning_cosine": compute_meaning_cosine(source_text, output_text)
    }

# -----------------------------------------------------------------------------
# Guardrails
# -----------------------------------------------------------------------------

GUARDRAILS = {
    "short_sentences": {
        "name": "Short Sentences",
        "description": "Average sentence length ≤ 15 words",
        "check": lambda m: m["avg_sentence_len_words"] <= 15
    },
    "no_long_sentences": {
        "name": "No Long Sentences",
        "description": "Less than 10% of sentences > 20 words",
        "check": lambda m: m["pct_sentences_gt20"] <= 10
    },
    "readable": {
        "name": "Readable (ARI)",
        "description": "ARI score ≤ 8 (8th grade level or below)",
        "check": lambda m: m["ari_score"] <= 8
    },
    "preserves_meaning": {
        "name": "Preserves Meaning",
        "description": "Cosine similarity ≥ 0.70 with source",
        "check": lambda m: m["meaning_cosine"] >= 0.70
    }
}


def evaluate_guardrails(metrics: dict) -> tuple[int, int, list[str]]:
    """
    Evaluate guardrails against metrics.
    
    Returns:
        tuple of (passed_count, total_count, failed_guardrail_names)
    """
    passed = 0
    failed = []
    
    for guardrail_id, guardrail in GUARDRAILS.items():
        try:
            if guardrail["check"](metrics):
                passed += 1
            else:
                failed.append(guardrail["name"])
        except Exception:
            failed.append(f"{guardrail['name']} (error)")
    
    return passed, len(GUARDRAILS), failed

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

def create_log_entry(
    source_text: str,
    output_text: str,
    model: str,
    template: str,
    language: str = "de"
) -> dict:
    """
    Create a complete log entry for a simplification output.
    
    Args:
        source_text: Original input text
        output_text: Simplified output text
        model: Model identifier (e.g., "llama-3.1-8b-instant")
        template: Template filename (e.g., "system_prompt_de.txt")
        language: Language code ("de" or "en")
    
    Returns:
        dict: Complete log entry
    """
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    metrics = compute_metrics(source_text, output_text)
    passed, total, failed = evaluate_guardrails(metrics)
    
    return {
        "timestamp": timestamp,
        "source_text": source_text,
        "output_text": output_text,
        "model": model,
        "template": template,
        "language": language,
        "metrics": metrics,
        "guardrails_passed": passed,
        "guardrails_total": total,
        "guardrails_failed": failed
    }


def log_simplification(
    source_text: str,
    output_text: str,
    model: str,
    template: str,
    language: str = "de",
    log_file: Path = DEFAULT_LOG_FILE
) -> dict:
    """
    Log a simplification output to the JSONL file.
    
    Args:
        source_text: Original input text
        output_text: Simplified output text
        model: Model identifier
        template: Template filename
        language: Language code
        log_file: Path to log file (defaults to data/logs/demo_outputs.jsonl)
    
    Returns:
        dict: The created log entry
    """
    entry = create_log_entry(source_text, output_text, model, template, language)
    
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    return entry


def load_all_logs(log_file: Path = DEFAULT_LOG_FILE) -> list[dict]:
    """Load all log entries from the JSONL file."""
    if not log_file.exists():
        return []
    
    logs = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                logs.append(json.loads(line))
    return logs


def compute_aggregate_stats(log_file: Path = DEFAULT_LOG_FILE) -> dict:
    """
    Compute aggregate statistics across all logs.
    
    Returns:
        dict with:
        - total_entries: Number of log entries
        - avg_metrics: Average of each metric
        - guardrails_summary: Pass rate and failure counts
    """
    logs = load_all_logs(log_file)
    
    if not logs:
        return {"total_entries": 0, "avg_metrics": {}, "guardrails_summary": {}}
    
    metrics_list = [log["metrics"] for log in logs if "metrics" in log]
    
    avg_metrics = {}
    if metrics_list:
        for key in metrics_list[0].keys():
            values = [m[key] for m in metrics_list if isinstance(m.get(key), (int, float))]
            if values:
                avg_metrics[f"avg_{key}"] = round(sum(values) / len(values), 2)
    
    total_passed = sum(log.get("guardrails_passed", 0) for log in logs)
    total_total = sum(log.get("guardrails_total", 0) for log in logs)
    
    failure_counts = {}
    for log in logs:
        for failed in log.get("guardrails_failed", []):
            failure_counts[failed] = failure_counts.get(failed, 0) + 1
    
    return {
        "total_entries": len(logs),
        "avg_metrics": avg_metrics,
        "guardrails_summary": {
            "total_passed": total_passed,
            "total_checks": total_total,
            "pass_rate": round(total_passed / total_total * 100, 1) if total_total > 0 else 0,
            "failure_counts": failure_counts
        }
    }
