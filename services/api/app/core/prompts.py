"""Prompt template loading (ported from apps/demo/app.py)"""
import os
from pathlib import Path
from pybars import Compiler

# Path to prompt templates
# For containerized deployment: templates are in services/api/prompts/templates/
# __file__ = services/api/app/core/prompts.py
# .parent (1) -> services/api/app/core
# .parent (2) -> services/api/app
# .parent (3) -> services/api
API_ROOT = Path(__file__).parent.parent.parent

# Allow override via environment variable for flexibility
TEMPLATES_DIR = Path(os.getenv("TEMPLATES_DIR", str(API_ROOT / "prompts" / "templates")))

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


def load_templates(lang: str) -> tuple[str, str]:
    """
    Load system and user prompt templates from prompts/templates/.
    
    Args:
        lang: Language code ('de' or 'en')
    
    Returns:
        tuple of (system_template, user_template)
        
    Raises:
        ValueError: If language not supported
        FileNotFoundError: If template files not found
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
    
    Args:
        user_template: Template string with {{text}} placeholder
        text: The text to simplify
    
    Returns:
        Rendered prompt string
    """
    compiler = Compiler()
    template = compiler.compile(user_template)
    
    # Build context for Handlebars - templates just use {{text}}
    context = {"text": text}
    
    return template(context)
