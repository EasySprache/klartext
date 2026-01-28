# Sample Texts for KlarText Demo

This directory contains sample texts organized by language and category for testing the KlarText simplification demo.

## Structure

```
samples/
  de/                          # German samples
    legal/                     # Legal texts
      sample_001.txt
      sample_002.txt
    medical/                   # Medical texts
      sample_001.txt
      sample_002.txt
    insurance/                 # Insurance texts
      sample_001.txt
      sample_002.txt
    technical/                 # Technical documentation
      sample_001.txt
      sample_002.txt
    government/                # Government/administrative texts
      sample_001.txt
      sample_002.txt
      sample_003.txt
  
  en/                          # English samples
    academic/                  # Academic texts
      sample_001.txt
      sample_002.txt
      sample_003.txt
    legal/                     # Legal texts
      sample_001.txt
      sample_002.txt
      sample_003.txt
    medical/                   # Medical texts
      sample_001.txt
      sample_002.txt
    insurance/                 # Insurance texts
      sample_001.txt
      sample_002.txt
    technical/                 # Technical documentation
      sample_001.txt
      sample_002.txt
    government/                # Government/administrative texts
      sample_001.txt
      sample_002.txt
```

## Usage in Demo App

The Gradio demo (`apps/demo/app.py`) loads samples from this directory:
- **Random Sample Button**: Picks a random category, then a random file from that category
- All samples are automatically available in the UI

## Adding New Samples

To add new samples:

1. Navigate to the appropriate language and category folder
2. Create a new file with the next sequential number: `sample_NNN.txt`
3. Paste your complex text (paragraph-length is ideal)
4. Save the file

The demo will automatically pick up new samples without requiring a restart.

## Sample Content Guidelines

Each sample should:
- Be 2-5 sentences long (paragraph-length)
- Contain complex, professional language appropriate to the category
- Be realistic text from that domain (legal, medical, technical, etc.)
- Be in the correct language (German or English)
- Avoid sensitive/personal information

## Categories

### German (de)
- **legal**: Contracts, terms, legal notices
- **medical**: Medical instructions, procedures, diagnoses
- **insurance**: Insurance policies, claims procedures
- **technical**: Technical documentation, manuals
- **government**: Administrative texts, official notices

### English (en)
- **academic**: Research abstracts, academic prose
- **legal**: Legal agreements, terms of service
- **medical**: Medical procedures, pharmaceutical information
- **insurance**: Insurance policies, coverage terms
- **technical**: Software documentation, technical specs
- **government**: Government forms, official communications
