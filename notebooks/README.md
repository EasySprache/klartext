# KlarText Notebooks

Research and development notebooks for evaluation, scoring, and feedback loops.

## Evaluation & Scoring

- **00_klartext_overview.ipynb** - Project overview and baseline claims
- **05_easy_language_evaluation.ipynb** - Multi-model evaluation framework with readability metrics
- **06_easy_language_evaluation_template.ipynb** - Template for evaluation
- **07_prompt_evaluation_template.ipynb** - Prompt evaluation framework
- **08_ext_model_scoring.ipynb** - External model scoring comparison

## Feedback & Logging

- **10_feedback_loop_implementation_workflow.ipynb** - Sprint plan for feedback pipeline
- **11_internal_feedback_loop_system.ipynb** - Internal evaluation pipeline design
- **12_demo_logging_setup.ipynb** - Demo logging setup and analysis (implemented in demo)

## Usage

These notebooks use data science dependencies from the root `Requirements.txt`:

```bash
pip install -r Requirements.txt
jupyter notebook
```

## Status

Most notebooks are for research and metric development. Key implementations:

- Demo logging (12_demo_logging_setup.ipynb) → Implemented in `apps/demo/`
- Evaluation metrics (05, 08) → Referenced in `docs/scoring_feedback_pipeline_proposal.md`
