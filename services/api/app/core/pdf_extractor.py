"""
PDF text extraction with cleanup for KlarText API.

Ported from apps/demo/pdf_utils.py with enhancements for API usage.
"""

import re
import tempfile
from pathlib import Path
import pymupdf


def extract_pdf_text(
    pdf_content: bytes,
    filename: str = "upload.pdf",
    margin_pct: float = 0.08,
) -> tuple[str, int, list[str]]:
    """
    Extract and clean text from PDF bytes.
    
    Args:
        pdf_content: Raw PDF file bytes
        filename: Original filename (for error messages)
        margin_pct: Percentage of page height to treat as header/footer zone
                   (default 8% from top and bottom)
    
    Returns:
        tuple of (extracted_text, page_count, warnings)
        
    Raises:
        ValueError: If PDF cannot be opened or processed
    """
    warnings = []
    
    # Write to temporary file (PyMuPDF needs file path)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_content)
        tmp_path = tmp.name
    
    try:
        doc = pymupdf.open(tmp_path)
        
        if doc.is_encrypted:
            doc.close()
            Path(tmp_path).unlink()
            raise ValueError("PDF is password-protected. Please provide an unencrypted PDF.")
        
        page_count = len(doc)
        all_text = []
        
        for page_num, page in enumerate(doc, start=1):
            height = page.rect.height
            margin = height * margin_pct
            
            # Get text blocks with positions: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            
            if not blocks or len(blocks) == 0:
                warnings.append(f"page_{page_num}_appears_empty")
                continue
            
            page_text = []
            for block in blocks:
                y0 = block[1]  # Top of block
                y1 = block[3]  # Bottom of block
                text = block[4]
                
                # Skip non-text blocks (images, etc.)
                if len(block) > 6 and block[6] != 0:
                    continue
                
                # Skip header zone (top margin)
                if y0 < margin:
                    continue
                
                # Skip footer zone (bottom margin)
                if y1 > (height - margin):
                    continue
                
                page_text.append(text.strip())
            
            if page_text:
                all_text.append("\n".join(page_text))
            else:
                warnings.append(f"page_{page_num}_no_extractable_text")
        
        doc.close()
        
        # Clean up temp file
        Path(tmp_path).unlink()
        
        if not all_text:
            raise ValueError("No text could be extracted from PDF. It may be image-only or corrupted.")
        
        # Join pages and apply text cleanup
        raw_text = "\n\n".join(all_text)
        cleaned_text = clean_extracted_text(raw_text)
        
        # Add warnings for very long documents
        word_count = len(cleaned_text.split())
        if word_count > 5000:
            warnings.append("document_is_very_long")
        
        if not cleaned_text.strip():
            raise ValueError("Extracted text is empty after cleanup")
        
        return cleaned_text, page_count, warnings
        
    except pymupdf.FileDataError as e:
        # Clean up temp file if it exists
        if Path(tmp_path).exists():
            Path(tmp_path).unlink()
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")
    except Exception as e:
        # Clean up temp file if it exists
        if Path(tmp_path).exists():
            Path(tmp_path).unlink()
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


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
