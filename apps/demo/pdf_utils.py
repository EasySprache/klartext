"""
PDF text extraction with cleanup for KlarText demo.

This module extracts text from PDF files and applies cleanup transformations
to prepare it for simplification:
- Header/footer removal (based on page position)
- De-hyphenation (joining words split across lines)
- Whitespace normalization
"""

import re
import pymupdf


def extract_pdf_text(pdf_path: str, margin_pct: float = 0.08) -> str:
    """
    Extract and clean text from PDF.
    
    Args:
        pdf_path: Path to PDF file
        margin_pct: Percentage of page height to treat as header/footer zone
                   (default 8% from top and bottom)
    
    Returns:
        Cleaned text string
    
    Raises:
        Exception: If PDF cannot be opened or processed
    """
    doc = pymupdf.open(pdf_path)
    all_text = []
    
    for page in doc:
        height = page.rect.height
        margin = height * margin_pct
        
        # Get text blocks with positions: (x0, y0, x1, y1, text, block_no, block_type)
        blocks = page.get_text("blocks")
        
        page_text = []
        for block in blocks:
            y0 = block[1]  # Top of block
            y1 = block[3]  # Bottom of block
            text = block[4]
            
            # Skip non-text blocks (block_type != 0)
            if len(block) > 6 and block[6] != 0:
                continue
            
            # Skip header zone (top margin)
            if y0 < margin:
                continue
            
            # Skip footer zone (bottom margin)
            if y1 > (height - margin):
                continue
            
            page_text.append(text.strip())
        
        all_text.append("\n".join(page_text))
    
    doc.close()
    
    # Join pages and apply text cleanup
    raw_text = "\n\n".join(all_text)
    return clean_extracted_text(raw_text)


def clean_extracted_text(text: str) -> str:
    """
    Apply cleanup transformations to extracted text.
    
    Steps:
    1. De-hyphenate words split across lines
    2. Normalize line breaks (preserve paragraphs)
    3. Normalize whitespace
    
    Args:
        text: Raw extracted text
    
    Returns:
        Cleaned text string
    """
    if not text:
        return ""
    
    # 1. De-hyphenate: join "word-\n" patterns
    # Matches: word character, hyphen, newline, word character
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    
    # 2. Normalize line breaks
    # Single newlines within paragraphs → space
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # 3+ consecutive newlines → 2 (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 3. Normalize whitespace
    # Multiple spaces/tabs → single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove trailing spaces from lines
    text = re.sub(r' +\n', '\n', text)
    # Remove leading spaces from lines
    text = re.sub(r'\n +', '\n', text)
    
    return text.strip()
