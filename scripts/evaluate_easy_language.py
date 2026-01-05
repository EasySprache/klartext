#!/usr/bin/env python3
"""
Easy Language LLM Evaluation Script

Evaluates LLM models on their ability to convert complex text into Easy Language
following strict rules for sentence structure and word choice.

Usage:
    python scripts/evaluate_easy_language.py
    python scripts/evaluate_easy_language.py --models "qwen/qwen3-32b,llama-3.3-70b-versatile"
    python scripts/evaluate_easy_language.py --output results.csv --verbose
"""

import os
import sys
import json
import argparse
import re
from datetime import datetime
from pathlib import Path
from collections import Counter

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    import pandas as pd
    from groq import Groq
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Run: pip install pandas groq python-dotenv")
    sys.exit(1)


# =============================================================================
# CONFIGURATION
# =============================================================================

# Default models to test
DEFAULT_MODELS = [
    "qwen/qwen3-32b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

# Model used for evaluation
EVAL_MODEL = "llama-3.3-70b-versatile"

# Easy Language Rules
RULES_TEXT = """
SENTENCE LEVEL RULES:
- A sentence should not be longer than 15 to 20 words.
- Ideally, a sentence should contain only one comma.
- Avoid parenthetical insertions and nested (complex) sentences.
- Use active verbs; avoid the passive voice.
- Write clear, unambiguous sentences.

WORD LEVEL RULES:
- Avoid foreign words whenever possible.
- Explain difficult and long (compound) words.
- You can write long or compound words with a hyphen.
- Avoid idioms, irony, and metaphors.
- Write out abbreviations whenever possible.
- Avoid negations.
- Avoid synonyms and stick to one term.
"""

# Default test sentences
DEFAULT_TEST_SENTENCES = [
    "Although the study showed a clear benefit, the authors warned that the results might look different for older people because bodies can change with age.",
    "When the region uses a lot of electricity at the same time, operators may turn on extra backup systems so the power stays steady even if a main line is being repaired.",
    "After the team reviewed the data with a common method, they said their forecast improved, even though the result still depended a lot on how good the data was.",
    "While the new facility worked well in early tests, engineers said costs could rise over time because parts wear out faster in humid weather.",
    "If hospitals follow the updated safety rules, staff could see fewer computer outages, because saved copies make it easier to recover after an attack.",
    "Since the city added more air checks, officials can spot dirty-air peaks sooner, even when the weather keeps pollution close to the ground.",
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def count_words(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def count_sentences(text: str) -> int:
    """Count sentences in text."""
    sentences = re.split(r'[.!?]+', text)
    return len([s for s in sentences if s.strip()])


def avg_sentence_length(text: str) -> float:
    """Calculate average words per sentence."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return 0
    return sum(len(s.split()) for s in sentences) / len(sentences)


def strip_thinking_tags(text: str) -> str:
    """
    Remove thinking tags and other verbose output that some models (like Qwen) include.
    
    This strips:
    - <think>...</think> blocks
    - <thinking>...</thinking> blocks
    - Any other common verbose tags
    
    Args:
        text: The text to clean
        
    Returns:
        Cleaned text with thinking tags removed
    """
    # Remove <think>...</think> blocks (case-insensitive, handles newlines)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove <thinking>...</thinking> blocks
    text = re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Clean up extra whitespace that may result from removal
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Multiple blank lines -> double newline
    text = text.strip()
    
    return text


def simplify_text(client: Groq, text: str, model: str) -> str:
    """
    Simplifies text using the specified model following Easy Language rules.
    """
    system_prompt = f"""You are an expert in Easy Language (Leichte Sprache / Plain Language).
Convert the following text into Easy Language by strictly following these rules:

{RULES_TEXT}

IMPORTANT:
- Output ONLY the simplified text, no explanations
- Break long sentences into shorter ones
- Keep all important information
"""
    
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.2,
            max_tokens=500
        )
        result = completion.choices[0].message.content.strip()
        
        # Strip thinking tags and other verbose output
        result = strip_thinking_tags(result)
        
        return result
    except Exception as e:
        return f"ERROR: {e}"


def evaluate_compliance(client: Groq, original: str, simplified: str) -> dict:
    """
    Uses an LLM evaluator to score the simplification against Easy Language rules.
    """
    eval_prompt = f"""You are a strict evaluator for Easy Language compliance.

RULES TO CHECK:
{RULES_TEXT}

ORIGINAL TEXT:
"{original}"

SIMPLIFIED TEXT:
"{simplified}"

TASK: Evaluate the SIMPLIFIED text against ALL rules above.

Provide your evaluation as a JSON object with these exact keys:
- "sentence_length_score": (0-10) Are sentences 15-20 words max?
- "structure_score": (0-10) Simple structure, no nesting, minimal commas?
- "active_voice_score": (0-10) Uses active verbs, avoids passive?
- "word_choice_score": (0-10) Simple words, no idioms/metaphors/negations?
- "clarity_score": (0-10) Clear and unambiguous?
- "overall_score": (0-10) Overall Easy Language quality
- "violation_notes": List of specific rule violations found
- "strengths": List of things done well

Be strict but fair. A score of 10 means perfect compliance."""
    
    try:
        completion = client.chat.completions.create(
            model=EVAL_MODEL,
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# MAIN EVALUATION FUNCTION
# =============================================================================

def run_evaluation(
    models: list[str],
    test_sentences: list[str],
    output_path: str = None,
    verbose: bool = False
) -> pd.DataFrame:
    """
    Run the Easy Language evaluation on specified models and sentences.
    
    Args:
        models: List of model IDs to test
        test_sentences: List of sentences to simplify
        output_path: Optional path to save CSV results
        verbose: Print detailed output
    
    Returns:
        DataFrame with evaluation results
    """
    # Load environment and connect to Groq
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("❌ ERROR: GROQ_API_KEY not found.")
        print("   Create a .env file with: GROQ_API_KEY=your_key_here")
        sys.exit(1)
    
    client = Groq(api_key=api_key)
    print("✅ Connected to Groq API")
    
    # Run evaluation
    results = []
    total_tasks = len(test_sentences) * len(models)
    
    print(f"\n🚀 Starting evaluation...")
    print(f"   {len(test_sentences)} sentences × {len(models)} models = {total_tasks} tasks")
    print(f"   Evaluator: {EVAL_MODEL}")
    print("=" * 70)
    
    task_num = 0
    for i, sentence in enumerate(test_sentences, 1):
        if verbose:
            print(f"\n📝 Sentence {i}/{len(test_sentences)}:")
            print(f"   \"{sentence[:80]}...\"")
        
        for model in models:
            task_num += 1
            model_short = model.split("/")[-1][:25]
            
            print(f"[{task_num}/{total_tasks}] {model_short}...", end=" ", flush=True)
            
            # 1. Simplify
            simplified = simplify_text(client, sentence, model)
            
            # 2. Calculate metrics
            orig_words = count_words(sentence)
            simp_words = count_words(simplified)
            orig_avg_len = avg_sentence_length(sentence)
            simp_avg_len = avg_sentence_length(simplified)
            
            # 3. Evaluate
            eval_data = evaluate_compliance(client, sentence, simplified)
            
            # 4. Store results
            results.append({
                "sentence_id": i,
                "model": model,
                "original": sentence,
                "simplified": simplified,
                "orig_word_count": orig_words,
                "simp_word_count": simp_words,
                "orig_avg_sentence_len": round(orig_avg_len, 1),
                "simp_avg_sentence_len": round(simp_avg_len, 1),
                **eval_data
            })
            
            score = eval_data.get("overall_score", "N/A")
            print(f"Score: {score}/10")
            
            if verbose and simplified and not simplified.startswith("ERROR"):
                print(f"      → \"{simplified[:100]}...\"")
    
    print("\n" + "=" * 70)
    print("✅ Evaluation complete!")
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Print summary
    print_summary(df)
    
    # Save results
    if output_path:
        df.to_csv(output_path, index=False)
        print(f"\n💾 Results saved to: {output_path}")
    
    return df


def print_summary(df: pd.DataFrame):
    """Print evaluation summary."""
    score_cols = [
        "sentence_length_score",
        "structure_score", 
        "active_voice_score",
        "word_choice_score",
        "clarity_score",
        "overall_score"
    ]
    
    # Filter to only existing columns
    score_cols = [c for c in score_cols if c in df.columns]
    
    if not score_cols:
        print("\n⚠️ No score columns found in results")
        return
    
    print("\n📊 SUMMARY BY MODEL")
    print("=" * 70)
    
    summary = df.groupby("model")[score_cols].mean().round(2)
    print(summary.to_string())
    
    # Best model
    if "overall_score" in df.columns:
        best_model = summary["overall_score"].idxmax()
        best_score = summary.loc[best_model, "overall_score"]
        print(f"\n🏆 Best model: {best_model}")
        print(f"   Overall score: {best_score}/10")
    
    # Common violations
    if "violation_notes" in df.columns:
        all_violations = []
        for violations in df["violation_notes"].dropna():
            if isinstance(violations, list):
                all_violations.extend(violations)
        
        if all_violations:
            print("\n⚠️ Most common violations:")
            for violation, count in Counter(all_violations).most_common(5):
                print(f"   {count}x - {violation}")


# =============================================================================
# CLI INTERFACE
# =============================================================================

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Evaluate LLM models on Easy Language conversion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python evaluate_easy_language.py
  python evaluate_easy_language.py --models "qwen/qwen3-32b,llama-3.3-70b-versatile"
  python evaluate_easy_language.py --output results.csv --verbose
  python evaluate_easy_language.py --sentences-file custom_sentences.txt
        """
    )
    
    parser.add_argument(
        "--models", "-m",
        type=str,
        default=None,
        help="Comma-separated list of model IDs to test (default: predefined list)"
    )
    
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Output CSV file path (default: data/processed/eval_TIMESTAMP.csv)"
    )
    
    parser.add_argument(
        "--sentences-file", "-s",
        type=str,
        default=None,
        help="Path to file with test sentences (one per line)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed output"
    )
    
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List available models on Groq and exit"
    )
    
    return parser.parse_args()


def list_available_models():
    """List available models on Groq."""
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("❌ GROQ_API_KEY not found")
        return
    
    client = Groq(api_key=api_key)
    print("📋 Available Models on Groq:")
    
    try:
        models = client.models.list()
        for m in models.data:
            print(f"   - {m.id}")
    except Exception as e:
        print(f"⚠️ Error: {e}")


def main():
    """Main entry point."""
    args = parse_args()
    
    # List models and exit
    if args.list_models:
        list_available_models()
        return
    
    # Parse models
    if args.models:
        models = [m.strip() for m in args.models.split(",")]
    else:
        models = DEFAULT_MODELS
    
    # Parse sentences
    if args.sentences_file:
        with open(args.sentences_file, "r") as f:
            sentences = [line.strip() for line in f if line.strip()]
    else:
        sentences = DEFAULT_TEST_SENTENCES
    
    # Set output path
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = project_root / "data" / "processed"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(output_dir / f"eval_{timestamp}.csv")
    
    # Run evaluation
    print("\n" + "=" * 70)
    print("🔬 EASY LANGUAGE LLM EVALUATION")
    print("=" * 70)
    print(f"Models: {', '.join(models)}")
    print(f"Sentences: {len(sentences)}")
    print(f"Output: {output_path}")
    
    run_evaluation(
        models=models,
        test_sentences=sentences,
        output_path=output_path,
        verbose=args.verbose
    )


if __name__ == "__main__":
    main()

