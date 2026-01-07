#!/usr/bin/env python3
"""
Model Comparison Script for Easy Language Evaluation
Runs qwen3-32b, gemma2-9b-it, and mixtral-8x7b via Groq API
"""

import os
import sys
import json
import time
import re
import csv
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from groq import Groq

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
os.chdir(project_root)

# Load environment
load_dotenv()

print("=" * 70)
print("🚀 Easy Language Model Comparison")
print("=" * 70)

# Check API key
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("❌ GROQ_API_KEY not found in environment")
    sys.exit(1)
print("✅ GROQ_API_KEY loaded")

# Initialize client
client = Groq(api_key=api_key)

# Configuration
MODELS = [
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

PROMPT_TEMPLATE = """You are a Plain Language specialist.
Rewrite the following text in Plain English that is easy to understand.

Rules:
- Use short sentences. Aim for 12-15 words. Avoid sentences over 20 words.
- Use active voice. Avoid passive constructions.
- Avoid negatives when possible.
- Explain difficult terms briefly if they are necessary.
- Use the same word for the same concept throughout.
- Keep the meaning. Do not add new facts.

Text:
{source_text}
"""

# Load benchmark
benchmark_path = project_root / "data" / "benchmark.jsonl"
benchmark = []
with open(benchmark_path, "r") as f:
    for line in f:
        if line.strip():
            benchmark.append(json.loads(line))

print(f"📊 Loaded {len(benchmark)} benchmark items")
print(f"📋 Models to test: {[m.split('/')[-1] for m in MODELS]}")

# Helper functions
def count_words(text):
    return len(re.findall(r'\b\w+\b', text))

def count_sentences(text):
    sentences = re.split(r'[.!?]+', text)
    return len([s for s in sentences if s.strip()])

def avg_sentence_length(text):
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return 0
    total_words = sum(len(re.findall(r'\b\w+\b', s)) for s in sentences)
    return total_words / len(sentences)

def pct_long_sentences(text, threshold=20):
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return 0
    long_count = sum(1 for s in sentences if len(re.findall(r'\b\w+\b', s)) > threshold)
    return long_count / len(sentences)

def calc_lix(text):
    words = re.findall(r'\b\w+\b', text)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    if not words or not sentences:
        return 0
    long_words = sum(1 for w in words if len(w) > 6)
    return (len(words) / len(sentences)) + (long_words * 100 / len(words))

def simplify_text(text, model):
    """Generate simplified text using Groq API."""
    prompt = PROMPT_TEMPLATE.format(source_text=text)
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"[ERROR] {e}"

# Run evaluation
results = []
print("\n" + "=" * 70)
print("Starting generation...")
print("=" * 70)

for model in MODELS:
    model_short = model.split("/")[-1]
    print(f"\n🤖 Testing: {model_short}")
    
    for i, item in enumerate(benchmark):
        print(f"   [{i+1}/{len(benchmark)}] {item['id']}: {item['source_text'][:50]}...")
        
        t0 = time.time()
        output = simplify_text(item["source_text"], model)
        latency = time.time() - t0
        
        # Skip errors
        if output.startswith("[ERROR]"):
            print(f"      ⚠️ Error: {output[:80]}")
            results.append({
                "model": model_short,
                "id": item["id"],
                "category": item.get("category", ""),
                "source_text": item["source_text"],
                "output_text": output,
                "latency_s": round(latency, 2),
                "out_sentences": 0,
                "out_avg_sent_len": 0,
                "out_pct_long_sent": 0,
                "out_lix": 0,
                "error": True
            })
            continue
        
        # Compute metrics
        results.append({
            "model": model_short,
            "id": item["id"],
            "category": item.get("category", ""),
            "source_text": item["source_text"],
            "output_text": output,
            "latency_s": round(latency, 2),
            "out_sentences": count_sentences(output),
            "out_avg_sent_len": round(avg_sentence_length(output), 1),
            "out_pct_long_sent": round(pct_long_sentences(output) * 100, 1),
            "out_lix": round(calc_lix(output), 1),
            "error": False
        })
        
        print(f"      ✅ Done ({latency:.1f}s) - {count_sentences(output)} sent, avg {avg_sentence_length(output):.1f} words, LIX={calc_lix(output):.1f}")
        
        # Rate limit
        time.sleep(1)

# Compute summary
print("\n" + "=" * 70)
print("📊 RESULTS SUMMARY")
print("=" * 70)

model_stats = {}
for r in results:
    if r["error"]:
        continue
    m = r["model"]
    if m not in model_stats:
        model_stats[m] = {"count": 0, "latency": 0, "sent_len": 0, "pct_long": 0, "lix": 0}
    model_stats[m]["count"] += 1
    model_stats[m]["latency"] += r["latency_s"]
    model_stats[m]["sent_len"] += r["out_avg_sent_len"]
    model_stats[m]["pct_long"] += r["out_pct_long_sent"]
    model_stats[m]["lix"] += r["out_lix"]

print("\n{:<20} {:>8} {:>12} {:>12} {:>12} {:>10}".format(
    "Model", "Items", "Latency(s)", "Avg Sent Len", "% Long Sent", "LIX"))
print("-" * 76)

best_model = None
best_lix = float('inf')

for model, stats in model_stats.items():
    n = stats["count"]
    if n == 0:
        continue
    avg_latency = stats["latency"] / n
    avg_sent_len = stats["sent_len"] / n
    avg_pct_long = stats["pct_long"] / n
    avg_lix = stats["lix"] / n
    
    print("{:<20} {:>8} {:>12.2f} {:>12.1f} {:>12.1f}% {:>10.1f}".format(
        model, n, avg_latency, avg_sent_len, avg_pct_long, avg_lix))
    
    if avg_lix < best_lix:
        best_lix = avg_lix
        best_model = model

print(f"\n🏆 Best Model (lowest LIX): {best_model} (LIX={best_lix:.1f})")

# Save results
output_dir = project_root / "outputs" / "reports"
output_dir.mkdir(parents=True, exist_ok=True)

# Save detailed results as CSV
results_path = output_dir / "model_comparison_detailed.csv"
with open(results_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=results[0].keys())
    writer.writeheader()
    writer.writerows(results)
print(f"\n💾 Detailed results saved to: {results_path}")

# Print sample outputs
print("\n" + "=" * 70)
print("📝 SAMPLE OUTPUTS (first successful item per model)")
print("=" * 70)

shown_models = set()
for r in results:
    if r["error"] or r["model"] in shown_models:
        continue
    shown_models.add(r["model"])
    print(f"\n🤖 {r['model']}")
    print(f"   Source: {r['source_text'][:80]}...")
    print(f"   Output: {r['output_text'][:150]}...")
    print(f"   Metrics: {r['out_sentences']} sentences, avg {r['out_avg_sent_len']} words, LIX={r['out_lix']}")

# Generate markdown summary
md_path = output_dir / "model_comparison_results.md"
with open(md_path, "w") as f:
    f.write("# Model Comparison Results\n\n")
    f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
    f.write("## Models Tested\n\n")
    f.write("| Model | Description |\n")
    f.write("|-------|-------------|\n")
    f.write("| qwen3-32b | Qwen 3 32B - Alibaba's multilingual model |\n")
    f.write("| llama-3.3-70b-versatile | Llama 3.3 70B - Meta's versatile model |\n")
    f.write("| llama-3.1-8b-instant | Llama 3.1 8B - Meta's fast, efficient model |\n\n")
    
    f.write("## Results Summary\n\n")
    f.write("| Model | Items | Avg Latency | Avg Sent Len | % Long Sent | LIX |\n")
    f.write("|-------|-------|-------------|--------------|-------------|-----|\n")
    for model, stats in model_stats.items():
        n = stats["count"]
        if n == 0:
            continue
        f.write(f"| {model} | {n} | {stats['latency']/n:.2f}s | {stats['sent_len']/n:.1f} | {stats['pct_long']/n:.1f}% | {stats['lix']/n:.1f} |\n")
    
    f.write(f"\n## 🏆 Best Model: **{best_model}**\n\n")
    f.write(f"Lowest average LIX score: {best_lix:.1f}\n\n")
    
    f.write("## Sample Outputs\n\n")
    shown_models = set()
    for r in results:
        if r["error"] or r["model"] in shown_models:
            continue
        shown_models.add(r["model"])
        f.write(f"### {r['model']}\n\n")
        f.write(f"**Source:** {r['source_text']}\n\n")
        f.write(f"**Output:** {r['output_text']}\n\n")
        f.write(f"**Metrics:** {r['out_sentences']} sentences, avg {r['out_avg_sent_len']} words, LIX={r['out_lix']}\n\n")
        f.write("---\n\n")

print(f"💾 Markdown report saved to: {md_path}")

print("\n" + "=" * 70)
print("✅ Evaluation complete!")
print("=" * 70)
