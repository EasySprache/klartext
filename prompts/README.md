# Prompts Library

This directory acts as the **central library** for prompt engineering in KlarText.

It is used for:
1.  **Exploration**: Developing and testing new prompt ideas (in `development/`).
2.  **Versioning**: Storing stable versions of prompt templates (in `templates/`).

> [!IMPORTANT]
> **Production Prompts are Separate**
> The prompts in this directory are **not** automatically used in production.
> To deploy a prompt, you must **copy** the content from a versioned file here into the production application at:
> `services/api/prompts/templates/`

## Directory Structure

```
.
├── development/                      # 1. DISCOVER & EXPLORE
│   └── 03.1_prompt_scoring_erinn.ipynb
│
├── templates/                        # 2. VERSION & SAVE
│   ├── v1/                           #    Historical versions
│   └── v2/                           #    Latest stable versions (e.g.)
│       ├── system_prompt_en.txt
│       ├── user_prompt_en.txt
│       └── ...
│
└── README.md
```

## Workflow: How to Update Prompts

### 1. Discover & Explore
Use the notebooks in `development/` to test new prompt ideas.
- Edit prompts directly in the notebook or create temporary files.
- Run against the sample texts in `data/samples`.
- Evaluate using the scoring metrics (LIX, brevity, etc.).

### 2. Save & Version
Once you are happy with a prompt:
1.  Create a new version folder in `templates/` (e.g., `templates/v3/`).
2.  Save your refined prompt text files there (e.g., `system_prompt_en.txt`).
3.  Add a `VERSION_NOTES.md` explaining what changed.

### 3. Deploy to Production
To make your new prompt "live" in the API:
1.  **Copy the content** of your new prompt file (e.g., `prompts/templates/v3/system_prompt_en.txt`).
2.  **Paste it** into the corresponding production file:
    *   `services/api/prompts/templates/system_prompt_en.txt` (or `_de.txt` etc)
3.  Restart the API service to pick up the changes.

## Why this workflow?
We separate our **experiments** (this directory) from **production code** (`services/api/...`). This ensures that:
- We keep a history of each major prompt version we've tested.
- We can explore ideas in notebooks without breaking the app.
- Deployment is an explicit, intentional act.
