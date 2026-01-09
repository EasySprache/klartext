"""
KlarText Gradio Demo
====================
A shareable test interface for the team to evaluate text simplification.

Run locally:
    python demo/app.py

Share with team:
    python demo/app.py --share

Environment variables:
    GROQ_API_KEY - Your Groq API key (required)

This demo loads prompt templates from prompts/templates/ so changes
to those files are automatically reflected here.
"""

import os
import sys
import argparse
import random
import re
from pathlib import Path

import gradio as gr
from groq import Groq
from pybars import Compiler

from pdf_utils import extract_pdf_text

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

GROQ_MODEL = "llama-3.1-8b-instant"  # Recommended from evaluation (best LIX score, good structure)

# Project root (demo is in /demo, templates are in /prompts/templates)
PROJECT_ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "prompts" / "templates"
SAMPLES_DIR = PROJECT_ROOT / "data" / "samples"

# Prompt template files (few-shot with examples, Level I / Very Easy)
# Split into system (identity, rules, examples) and user (task) prompts
TEMPLATE_FILES = {
    "de": {
        "system": "system_prompt_de.txt",
        "user": "user_prompt_de.txt",
    },
    "en": {
        "system": "system_prompt_en.txt",
        "user": "user_prompt_en.txt",
    },
}

# Sample text files by language (filename prefix -> display name)
SAMPLE_CATEGORIES = {
    "de": {
        "de_legal.txt": "Legal / Rechtlich",
        "de_medical.txt": "Medical / Medizinisch",
        "de_insurance.txt": "Insurance / Versicherung",
        "de_technical.txt": "Technical / Technisch",
        "de_government.txt": "Government / Behörde",
    },
    "en": {
        "en_academic.txt": "Academic",
        "en_medical.txt": "Medical",
        "en_legal.txt": "Legal",
        "en_insurance.txt": "Insurance",
        "en_technical.txt": "Technical",
        "en_government.txt": "Government",
    },
}

# -----------------------------------------------------------------------------
# Prompt Template Loading (from project's prompts/templates/)
# -----------------------------------------------------------------------------

def load_templates(lang: str) -> tuple[str, str]:
    """
    Load system and user prompt templates from prompts/templates/.
    
    Returns:
        tuple of (system_template, user_template)
        
    All languages use split templates:
    - System: identity, rules, and examples
    - User: task instruction with {{text}} placeholder
    """
    template_config = TEMPLATE_FILES.get(lang)
    if not template_config:
        raise ValueError(f"Template not available for language: {lang}")
    
    system_filename = template_config["system"]
    user_filename = template_config["user"]
    
    # Load system template
    system_file = TEMPLATES_DIR / system_filename
    if not system_file.exists():
        raise FileNotFoundError(f"System template not found: {system_file}")
    system_template = system_file.read_text(encoding="utf-8")
    
    # Load user template
    user_file = TEMPLATES_DIR / user_filename
    if not user_file.exists():
        raise FileNotFoundError(f"User template not found: {user_file}")
    user_template = user_file.read_text(encoding="utf-8")
    
    return system_template, user_template


def render_user_prompt(user_template: str, text: str) -> str:
    """
    Render the user prompt using Handlebars template.
    
    This reads the template fresh each time, so edits to the template
    files are immediately reflected without restarting the demo.
    """
    compiler = Compiler()
    template = compiler.compile(user_template)
    
    # Build context for Handlebars - templates just use {{text}}
    context = {"text": text}
    
    return template(context)


# -----------------------------------------------------------------------------
# Sample Text Loading (from project's data/samples/)
# -----------------------------------------------------------------------------

def load_random_sample(lang: str) -> tuple[str, str]:
    """
    Load a random sample text for the given language.
    
    Returns:
        tuple of (sample_text, category_label)
    """
    samples = SAMPLE_CATEGORIES.get(lang, {})
    if not samples:
        return f"No samples available for language: {lang}", "Unknown"
    
    # Pick a random sample file
    filename = random.choice(list(samples.keys()))
    category = samples[filename]
    
    sample_file = SAMPLES_DIR / filename
    if not sample_file.exists():
        return f"Sample file not found: {filename}", category
    
    text = sample_file.read_text(encoding="utf-8").strip()
    return text, category


def get_all_samples(lang: str) -> list[tuple[str, str, str]]:
    """
    Get all sample texts for a language.
    
    Returns:
        list of (filename, category_label, text)
    """
    samples = SAMPLE_CATEGORIES.get(lang, {})
    result = []
    
    for filename, category in samples.items():
        sample_file = SAMPLES_DIR / filename
        if sample_file.exists():
            text = sample_file.read_text(encoding="utf-8").strip()
            result.append((filename, category, text))
    
    return result


# -----------------------------------------------------------------------------
# Simple Scoring (First Pass - can be extracted to module later)
# -----------------------------------------------------------------------------

def split_sentences_for_scoring(text: str) -> list[str]:
    """Split text into sentences (simple heuristic)."""
    # Handle common abbreviations
    text_clean = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|e\.g|i\.e)\.\s', r'\1_DOT ', text)
    # Handle German abbreviations
    text_clean = re.sub(r'\b(z\.B|d\.h|usw|ggfs)\.\s', r'\1_DOT ', text_clean)
    sentences = re.split(r'[.!?]+\s+', text_clean.strip())
    return [s.strip() for s in sentences if s.strip()]


def get_words_for_scoring(text: str) -> list[str]:
    """Extract words from text (handles German umlauts)."""
    return re.findall(r'[A-Za-zÄÖÜäöüßéèêëàâáîïíôöóûüú]+', text)


def compute_simple_scores(text: str) -> dict:
    """Compute basic readability scores for simplified text."""
    sentences = split_sentences_for_scoring(text)
    words = get_words_for_scoring(text)
    
    if not sentences or not words:
        return {"error": "No content to score"}
    
    n_sentences = len(sentences)
    n_words = len(words)
    
    # Sentence lengths
    sent_lengths = [len(get_words_for_scoring(s)) for s in sentences]
    avg_sent_len = sum(sent_lengths) / n_sentences if n_sentences > 0 else 0
    long_sents = sum(1 for length in sent_lengths if length > 20)
    pct_long = (long_sents / n_sentences) * 100 if n_sentences > 0 else 0
    
    # Word lengths
    word_lengths = [len(w) for w in words]
    avg_word_len = sum(word_lengths) / n_words if n_words > 0 else 0
    long_words = sum(1 for length in word_lengths if length > 6)
    
    # LIX score: (words/sentences) + (long_words * 100 / words)
    lix = (n_words / n_sentences) + (long_words * 100.0 / n_words) if n_sentences > 0 and n_words > 0 else 0
    
    # Simple pass/fail checks based on Easy Language standards
    checks = {
        "sentence_length": avg_sent_len <= 15,
        "long_sentences": pct_long <= 10,
        "lix_score": lix <= 40,
    }
    passed = sum(checks.values())
    
    return {
        "sentences": n_sentences,
        "words": n_words,
        "avg_sentence_len": round(avg_sent_len, 1),
        "pct_long_sentences": round(pct_long, 1),
        "avg_word_len": round(avg_word_len, 1),
        "lix": round(lix, 1),
        "checks_passed": passed,
        "checks_total": len(checks),
        "check_details": checks,
    }


def format_scores_markdown(scores: dict) -> str:
    """Format scores as readable markdown for display."""
    if "error" in scores:
        return f"⚠️ {scores['error']}"
    
    passed = scores["checks_passed"]
    total = scores["checks_total"]
    
    # Determine status emoji
    if passed == total:
        status = "✅ Good"
    elif passed >= total - 1:
        status = "⚠️ Review"
    else:
        status = "❌ Needs work"
    
    # Build check indicators
    checks = scores["check_details"]
    sent_len_icon = "✓" if checks["sentence_length"] else "✗"
    long_sent_icon = "✓" if checks["long_sentences"] else "✗"
    lix_icon = "✓" if checks["lix_score"] else "✗"
    
    return f"""### 📊 Output Quality: {status}

| Metric | Value | Target | Check |
|--------|-------|--------|-------|
| Avg sentence length | **{scores['avg_sentence_len']}** words | ≤ 15 | {sent_len_icon} |
| Long sentences (>20 words) | **{scores['pct_long_sentences']}%** | ≤ 10% | {long_sent_icon} |
| LIX readability | **{scores['lix']}** | ≤ 40 | {lix_icon} |

*{scores['sentences']} sentences, {scores['words']} words • Checks passed: {passed}/{total}*
"""


# -----------------------------------------------------------------------------
# Simplification Function
# -----------------------------------------------------------------------------

def simplify_text(
    text: str,
    target_lang: str,
    api_key: str | None = None,
) -> tuple[str, str]:
    """Simplify text using Groq LLM with project prompt templates.
    
    Returns:
        tuple of (simplified_text, scores_markdown)
    """
    
    if not text.strip():
        return "⚠️ Please enter some text to simplify.", ""
    
    # Get API key from input or environment
    key = api_key or os.getenv("GROQ_API_KEY")
    if not key:
        return "❌ Error: GROQ_API_KEY not set. Please enter your API key or set the environment variable.", ""
    
    # Build prompts from project templates (loaded fresh each time)
    try:
        system_template, user_template = load_templates(lang=target_lang)
        
        # System: identity, rules, examples (no {{text}} placeholder)
        # User: task instruction + text (has {{text}} placeholder)
        system_prompt = system_template
        user_prompt = render_user_prompt(user_template, text)
    except FileNotFoundError as e:
        return f"❌ Error loading template: {e}", ""
    except Exception as e:
        return f"❌ Error rendering template: {e}", ""
    
    try:
        client = Groq(api_key=key)
        
        # Use split structure: system message for identity/rules/examples,
        # user message for the specific task. This aligns with evaluation
        # methodology used in notebooks/05_easy_language_evaluation.ipynb
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower for more consistent output
            max_tokens=2000,
        )
        
        output = response.choices[0].message.content
        
        # Compute and format scores
        scores = compute_simple_scores(output)
        scores_display = format_scores_markdown(scores)
        
        return output, scores_display
        
    except Exception as e:
        return f"❌ Error calling Groq API: {str(e)}", ""


# -----------------------------------------------------------------------------
# Gradio Interface
# -----------------------------------------------------------------------------

def create_demo():
    """Create the Gradio demo interface."""
    
    with gr.Blocks(title="KlarText Demo") as demo:
        
        gr.Markdown(
            """
            # 📝 KlarText Demo
            
            **Turn complex text into easy-to-understand language.**
            
            Paste any text below and we'll simplify it. Works in German and English.
            
            ---
            """
        )
        
        with gr.Row():
            with gr.Column():
                # API Key input (optional if env var is set)
                api_key_input = gr.Textbox(
                    label="Groq API Key (optional if GROQ_API_KEY is set)",
                    placeholder="gsk_...",
                    type="password",
                    visible=not bool(os.getenv("GROQ_API_KEY")),
                )
                
                # PDF upload
                pdf_upload = gr.File(
                    label="📄 Upload PDF (optional) / PDF hochladen",
                    file_types=[".pdf"],
                    type="filepath",
                )
                pdf_status = gr.Markdown(
                    value="",
                    visible=True,
                )
                
                input_text = gr.Textbox(
                    label="Original Text / Originaltext",
                    placeholder="Paste your text here or upload a PDF above...\nFügen Sie Ihren Text hier ein oder laden Sie ein PDF hoch...",
                    lines=10,
                    max_lines=20,
                )
                
                target_lang = gr.Radio(
                    choices=[("German / Deutsch", "de"), ("English", "en")],
                    value="de",
                    label="Output Language / Ausgabesprache",
                )
                
                simplify_btn = gr.Button(
                    "✨ Simplify Text / Text vereinfachen",
                    variant="primary",
                    size="lg",
                )
            
            with gr.Column():
                output_text = gr.Textbox(
                    label="Simplified Text / Vereinfachter Text",
                    lines=12,
                    max_lines=20,
                )
                
                # Quality scores display
                scores_display = gr.Markdown(
                    value="*Quality scores will appear after simplification*",
                    label="Quality Scores",
                )
        
        # Sample texts for quick testing
        gr.Markdown("### Sample Texts / Beispieltexte")
        
        sample_info = gr.Markdown("*Click a button to load a random sample*")
        
        with gr.Row():
            sample_de_btn = gr.Button("🎲 Random German Sample", size="sm")
            sample_en_btn = gr.Button("🎲 Random English Sample", size="sm")
        
        with gr.Accordion("Available sample categories / Verfügbare Kategorien", open=False):
            gr.Markdown(
                """
                **German / Deutsch:** Legal, Medical, Insurance, Technical, Government
                
                **English:** Academic, Medical, Legal, Insurance, Technical, Government
                
                Each click loads a different random sample from `data/samples/`
                """
            )
        
        # Event handlers
        simplify_btn.click(
            fn=simplify_text,
            inputs=[input_text, target_lang, api_key_input],
            outputs=[output_text, scores_display],
        )
        
        def load_de_sample():
            text, category = load_random_sample("de")
            return text, f"📄 Loaded: **{category}** (German)"
        
        def load_en_sample():
            text, category = load_random_sample("en")
            return text, f"📄 Loaded: **{category}** (English)"
        
        sample_de_btn.click(
            fn=load_de_sample,
            outputs=[input_text, sample_info],
        )
        
        sample_en_btn.click(
            fn=load_en_sample,
            outputs=[input_text, sample_info],
        )
        
        # PDF upload handler
        def handle_pdf_upload(pdf_file):
            """Extract text from uploaded PDF."""
            if pdf_file is None:
                return gr.skip(), ""
            
            try:
                text = extract_pdf_text(pdf_file)
                if not text.strip():
                    return gr.skip(), "⚠️ No text could be extracted from this PDF."
                
                # Count extracted content
                word_count = len(text.split())
                return text, f"✅ Extracted ~{word_count} words from PDF"
            except Exception as e:
                return gr.skip(), f"❌ Error extracting PDF: {str(e)}"
        
        pdf_upload.change(
            fn=handle_pdf_upload,
            inputs=[pdf_upload],
            outputs=[input_text, pdf_status],
        )
        
        gr.Markdown(
            """
            ---
            
            ⚠️ **Disclaimer / Haftungsausschluss:**  
            This tool produces "easy language" simplifications. It is **not** certified "Leichte Sprache" 
            and does not guarantee legal/medical/financial accuracy.
            
            🔒 **Privacy:** Your text is sent to Groq's API for processing. Do not enter sensitive personal data.
            """
        )
    
    return demo


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KlarText Gradio Demo")
    parser.add_argument(
        "--share",
        action="store_true",
        help="Create a public shareable link",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=7860,
        help="Port to run the server on (default: 7860)",
    )
    args = parser.parse_args()
    
    demo = create_demo()
    
    print("\n" + "=" * 60)
    print("🚀 KlarText Demo Starting...")
    if args.share:
        print("📤 Public link will be generated (valid ~72 hours)")
    print("=" * 60 + "\n")
    
    # Custom CSS for accessibility
    custom_css = """
    .gradio-container {
        font-size: 18px !important;
    }
    .prose {
        font-size: 18px !important;
        line-height: 1.6 !important;
    }
    textarea {
        font-size: 18px !important;
        line-height: 1.5 !important;
    }
    .dark .prose {
        color: #e5e5e5 !important;
    }
    button {
        font-size: 18px !important;
    }
    label {
        font-size: 16px !important;
    }
    """
    
    demo.launch(
        share=args.share,
        server_port=args.port,
        show_error=True,
        theme=gr.themes.Soft(primary_hue="blue", secondary_hue="cyan"),
        css=custom_css,
    )

