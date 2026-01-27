"""
TTS Adapter Module

Converts text to speech using gTTS (Google Text-to-Speech).
Returns base64-encoded audio for frontend playback.
No file storage - audio is generated in memory only.
"""

from io import BytesIO
import base64
import re

# Import gTTS with graceful fallback
try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False


def preprocess_text_for_tts(text: str) -> str:
    """
    Preprocess text to improve TTS output quality.
    
    - Removes bullet point markers that would be read aloud (*, -, •, etc.)
    - Ensures spacing after punctuation marks for proper pauses
    - Normalizes whitespace
    - Adds slight pauses for better readability
    """
    # Remove bullet point markers at start of lines - gTTS would read them as "asterisk", "dash", etc.
    # Replace with empty string - the newline already provides a natural pause
    text = re.sub(r'^[\*\-•●▪►▸‣⁃]\s*', '', text, flags=re.MULTILINE)
    
    # Also handle numbered lists (e.g., "1.", "2)", "a.") - keep the content, remove the marker
    text = re.sub(r'^(\d+[\.\)]\s*)', '', text, flags=re.MULTILINE)
    text = re.sub(r'^([a-zA-Z][\.\)]\s*)', '', text, flags=re.MULTILINE)
    
    # Ensure space after sentence-ending punctuation if followed by a letter
    text = re.sub(r'([.!?])([A-Za-zÄÖÜäöüß])', r'\1 \2', text)
    
    # Ensure space after commas, colons, semicolons if followed by a letter
    text = re.sub(r'([,:;])([A-Za-zÄÖÜäöüß])', r'\1 \2', text)
    
    # Remove any XML-like tags (e.g., <simplified_text>, </simplified_text>)
    # These would be read aloud by TTS or might cause issues
    text = re.sub(r'<[^>]+>', '', text)
    
    # Normalize multiple spaces to single space
    text = re.sub(r' +', ' ', text)
    
    # Normalize multiple newlines to double newline (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Strip leading/trailing whitespace from each line
    text = '\n'.join(line.strip() for line in text.split('\n'))
    
    # Strip leading/trailing whitespace from entire text
    text = text.strip()
    
    return text


def text_to_speech(text: str, lang: str = "de") -> dict:
    """
    Convert text to speech using gTTS.
    
    Args:
        text: The simplified text to convert (from UI output)
        lang: Language code ('de' or 'en')
        
    Returns:
        {
            "audio_base64": str,  # Base64-encoded MP3
            "format": "mp3"
        }
        
    Raises:
        RuntimeError: If gTTS is not installed
        Exception: If audio generation fails (network issues, etc.)
    """
    if not TTS_AVAILABLE:
        raise RuntimeError("gTTS is not installed. Please install with: pip install gTTS")
    
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Validate language
    supported_langs = ["de", "en"]
    if lang not in supported_langs:
        raise ValueError(f"Unsupported language: {lang}. Supported: {supported_langs}")
    
    # Preprocess text for better TTS output (proper pauses at punctuation)
    processed_text = preprocess_text_for_tts(text)
    
    # Generate audio in memory
    tts = gTTS(text=processed_text, lang=lang, slow=False)
    buffer = BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)
    
    # Encode to base64
    audio_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    return {
        "audio_base64": audio_base64,
        "format": "mp3"
    }
