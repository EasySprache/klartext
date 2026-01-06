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
from pathlib import Path

import gradio as gr
from groq import Groq
from pybars import Compiler

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

GROQ_MODEL = "llama-3.3-70b-versatile"  # Fast and capable

# Project root (demo is in /demo, templates are in /prompts/templates)
PROJECT_ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "prompts" / "templates"
SAMPLES_DIR = PROJECT_ROOT / "data" / "samples"

# Prompt template files (few-shot with examples, Level I / Very Easy)
TEMPLATE_FILES = {
    "de": "simplify_de_fewshot.txt",
    "en": "simplify_en_fewshot.txt",
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

def load_template(lang: str) -> str:
    """Load a prompt template file from prompts/templates/."""
    filename = TEMPLATE_FILES.get(lang)
    if not filename:
        raise ValueError(f"Template not available for language: {lang}")
    
    template_file = TEMPLATES_DIR / filename
    if not template_file.exists():
        raise FileNotFoundError(f"Template not found: {template_file}")
    return template_file.read_text(encoding="utf-8")


def render_prompt(lang: str, text: str) -> str:
    """
    Render a prompt using the project's Handlebars templates.
    
    This reads the template fresh each time, so edits to the template
    files are immediately reflected without restarting the demo.
    """
    template_source = load_template(lang)
    
    compiler = Compiler()
    template = compiler.compile(template_source)
    
    # Build context for Handlebars - fewshot templates just use {{text}}
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
# Simplification Function
# -----------------------------------------------------------------------------

def simplify_text(
    text: str,
    target_lang: str,
    api_key: str | None = None,
) -> str:
    """Simplify text using Groq LLM with project prompt templates."""
    
    if not text.strip():
        return "⚠️ Please enter some text to simplify."
    
    # Get API key from input or environment
    key = api_key or os.getenv("GROQ_API_KEY")
    if not key:
        return "❌ Error: GROQ_API_KEY not set. Please enter your API key or set the environment variable."
    
    # Build prompt from project templates (loaded fresh each time)
    try:
        prompt = render_prompt(lang=target_lang, text=text)
    except FileNotFoundError as e:
        return f"❌ Error loading template: {e}"
    except Exception as e:
        return f"❌ Error rendering template: {e}"
    
    try:
        client = Groq(api_key=key)
        
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,  # Lower for more consistent output
            max_tokens=2000,
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"❌ Error calling Groq API: {str(e)}"


# -----------------------------------------------------------------------------
# Gradio Interface
# -----------------------------------------------------------------------------

def create_demo():
    """Create the Gradio demo interface."""
    
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
                
                input_text = gr.Textbox(
                    label="Original Text / Originaltext",
                    placeholder="Paste your text here...\nFügen Sie Ihren Text hier ein...",
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
                    lines=15,
                    max_lines=25,
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
            outputs=output_text,
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
    
    demo.launch(
        share=args.share,
        server_port=args.port,
        show_error=True,
        theme=gr.themes.Soft(primary_hue="blue", secondary_hue="cyan"),
    )

