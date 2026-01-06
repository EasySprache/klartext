# KlarText Gradio Demo

A shareable test interface for the team to evaluate text simplification with Groq.

## ✨ Key Feature: Live Template Sync

This demo **loads prompts directly from the project's template files**:
- `prompts/templates/simplify_de.txt` (German)
- `prompts/templates/simplify_en.txt` (English)

**Templates are loaded fresh on each request**, so you can:
1. Edit the template files
2. Test immediately in the demo (no restart needed)
3. See how changes affect output quality

## Quick Start

### 1. Install dependencies

```bash
cd demo
pip install -r requirements.txt
```

Or if using the project's virtual environment:
```bash
pip install gradio groq
```

### 2. Set your Groq API key

```bash
export GROQ_API_KEY="gsk_your_key_here"
```

Get a free API key at: https://console.groq.com/

### 3. Run locally

```bash
python app.py
```

Opens at http://localhost:7860

### 4. Share with the team

```bash
python app.py --share
```

This generates a public URL (like `https://abc123.gradio.live`) valid for ~72 hours.
Share this link with the team - no deployment needed!

## Features

- **Two languages:** German and English simplification
- **Three levels:** Very Easy, Easy, Medium
- **Sample texts:** Quick-load examples for testing
- **Accessible UI:** 18px base font, good contrast
- **Copy button:** Easy to copy simplified text

## Model

Uses **Llama 3.3 70B** via Groq's API - fast inference with high quality output.

## Customization

Edit `app.py` to:
- Change the model: Modify `GROQ_MODEL`
- Adjust prompts: Edit `PROMPT_DE` / `PROMPT_EN`
- Change styling: Modify `custom_css`

## Privacy Note

Text is sent to Groq's API for processing. Do not enter sensitive personal data.

