"""LLM adapter for text simplification (ported from apps/demo/app.py)"""
import os
from groq import Groq
from .prompts import load_templates, render_user_prompt

# Model configuration
GROQ_MODEL = "llama-3.1-8b-instant"  # Best from evaluation (good LIX score, structure)


def simplify_text_with_llm(
    text: str,
    target_lang: str,
    level: str = "easy",
    api_key: str | None = None,
) -> str:
    """
    Simplify text using Groq LLM with project prompt templates.
    
    Args:
        text: The text to simplify
        target_lang: Target language ('de' or 'en')
        level: Simplification level (currently unused, templates are 'very_easy')
        api_key: Groq API key (defaults to GROQ_API_KEY env var)
    
    Returns:
        Simplified text string
        
    Raises:
        ValueError: If API key missing or invalid input
        FileNotFoundError: If template files not found
        Exception: If LLM API call fails
    """
    if not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Get API key from parameter or environment
    key = api_key or os.getenv("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY not set. Set environment variable or pass api_key parameter")
    
    # Load prompt templates
    system_template, user_template = load_templates(lang=target_lang)
    
    # System: identity, rules, examples (no {{text}} placeholder)
    # User: task instruction + text (has {{text}} placeholder)
    system_prompt = system_template
    user_prompt = render_user_prompt(user_template, text)
    
    # Call Groq LLM
    client = Groq(api_key=key)
    
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,  # Lower for more consistent output
        max_tokens=2000,
    )
    
    simplified_text = response.choices[0].message.content
    
    return simplified_text
