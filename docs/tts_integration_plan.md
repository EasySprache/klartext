# TTS Integration Plan for KlarText

> **Goal:** Add Text-to-Speech (TTS) functionality using gTTS to the API, enabling audio output for simplified text displayed in the UI.

## Overview

This document describes the TTS implementation for KlarText. The TTS endpoint receives already-simplified text from the frontend and converts it to speech audio. Audio is generated in-memory and returned as base64 - no file storage is used.

**Status:** Implemented and tested.

---

## Architecture

```
Frontend (web-mvp)                    Backend API
┌─────────────────┐                  ┌─────────────────┐
│                 │                  │                 │
│  Output Text    │──── POST ───────▶│  /v1/tts        │
│  (simplified)   │   {text, lang}   │                 │
│                 │                  │  ┌───────────┐  │
│  Read Aloud /   │◀── base64 ──────│  │tts_adapter│  │
│  Stop Button    │   audio/mp3      │  │  (gTTS)   │  │
└─────────────────┘                  │  └───────────┘  │
                                     └─────────────────┘
```

**Key Design Decisions:**
- **No storage**: Audio is generated in-memory and returned as base64 only
- **No simplification in TTS**: The endpoint only converts text to speech; it receives already-simplified text from the UI
- **Stateless**: Each request generates fresh audio; no caching layer
- **Fallback**: Frontend falls back to browser TTS if API fails
- **Text preprocessing**: Ensures proper pauses at punctuation marks
- **Stop control**: User can stop audio playback at any time

---

## Implementation

### API Endpoint

**Endpoint:** `POST /v1/tts`

**Request:**
```json
{
  "text": "Hallo, das ist ein Test.",
  "lang": "de"
}
```

**Response:**
```json
{
  "audio_base64": "//OExAAAAAAAAA...",
  "audio_url": null,
  "format": "mp3"
}
```

**Validation:**
- `text`: 1-5000 characters (required)
- `lang`: `de` or `en` (required)

**Error Responses:**
- `400`: Invalid input (empty text, unsupported language)
- `503`: TTS generation failed (network issues with gTTS)

---

## Files Changed

| File | Description |
|------|-------------|
| `services/api/requirements.txt` | Added `gTTS>=2.5.0` |
| `services/api/app/core/tts_adapter.py` | TTS generation module with text preprocessing |
| `services/api/app/main.py` | `/v1/tts` endpoint implementation |
| `apps/web-mvp/src/App.tsx` | Frontend with stop button and audio controls |
| `apps/web-mvp/src/contexts/LanguageContext.tsx` | Added `stopReading` translation |

---

## Backend Implementation

### Core Module: tts_adapter.py

The TTS adapter includes text preprocessing to improve audio quality by ensuring proper pauses at punctuation marks.

```python
import re
from gtts import gTTS
from io import BytesIO
import base64


def preprocess_text_for_tts(text: str) -> str:
    """
    Preprocess text to improve TTS output quality.
    
    - Ensures spacing after punctuation marks for proper pauses
    - Normalizes whitespace
    - Adds slight pauses for better readability
    """
    # Ensure space after sentence-ending punctuation if followed by a letter
    text = re.sub(r'([.!?])([A-Za-zÄÖÜäöüß])', r'\1 \2', text)
    
    # Ensure space after commas, colons, semicolons if followed by a letter
    text = re.sub(r'([,:;])([A-Za-zÄÖÜäöüß])', r'\1 \2', text)
    
    # Normalize multiple spaces to single space
    text = re.sub(r' +', ' ', text)
    
    # Normalize multiple newlines to double newline (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Add a slight pause (comma) after bullet points for clarity
    text = re.sub(r'^([-•●▪])\s*', r'\1, ', text, flags=re.MULTILINE)
    
    return text.strip()


def text_to_speech(text: str, lang: str = "de") -> dict:
    """Convert text to speech using gTTS (in-memory, no file storage)."""
    
    # Preprocess text for better TTS output
    processed_text = preprocess_text_for_tts(text)
    
    # Generate audio
    tts = gTTS(text=processed_text, lang=lang, slow=False)
    buffer = BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)
    
    audio_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return {"audio_base64": audio_base64, "format": "mp3"}
```

### Text Preprocessing Features

| Issue | Solution |
|-------|----------|
| Missing space after periods (`Hello.World`) | Regex adds space: `Hello. World` |
| Missing space after commas | Regex adds space for proper pause |
| Multiple spaces | Normalized to single space |
| Bullet points read too fast | Comma added after marker for pause |

---

## Frontend Implementation

### Key Features

1. **Toggle Button**: "Read Aloud" changes to "Stop reading" while playing
2. **Audio Cleanup**: Audio stops on page refresh/unmount
3. **Duplicate Prevention**: Multiple clicks don't create overlapping audio
4. **Fallback**: Browser TTS used if API fails
5. **Race Condition Prevention**: Request ID tracking ensures only the latest request plays
6. **Request Timeout**: 30-second timeout prevents indefinite waiting on slow/hung API

### State Management

```typescript
// State for tracking playback
const [isSpeaking, setIsSpeaking] = useState(false);

// Ref for audio element (allows stopping)
const audioRef = useRef<HTMLAudioElement | null>(null);

// Ref to track current request ID (prevents race conditions)
const currentRequestIdRef = useRef<number>(0);

// Ref for AbortController to cancel pending fetch requests
const abortControllerRef = useRef<AbortController | null>(null);
```

### Stop Function

```typescript
const stopSpeaking = useCallback(() => {
  // Increment request ID to invalidate any pending API responses
  currentRequestIdRef.current += 1;
  
  // Abort any pending fetch request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
  
  // Stop API audio
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }
  
  // Stop browser TTS
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  
  setIsSpeaking(false);
}, []);
```

### Cleanup on Page Refresh

```typescript
// Stop audio when component unmounts
useEffect(() => {
  return () => stopSpeaking();
}, [stopSpeaking]);

// Stop audio on page refresh/navigation
useEffect(() => {
  const handleBeforeUnload = () => stopSpeaking();
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [stopSpeaking]);
```

### Handle Speak Function

```typescript
const handleSpeak = async () => {
  // Toggle: if speaking, stop
  if (isSpeaking) {
    stopSpeaking();
    return;
  }
  
  if (!outputText) return;
  
  // Stop any existing audio (safety)
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }
  speechSynthesis.cancel();
  
  // Abort any pending request from previous attempt
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Generate unique request ID to prevent race conditions
  const requestId = currentRequestIdRef.current + 1;
  currentRequestIdRef.current = requestId;
  
  setIsSpeaking(true);
  
  // Create AbortController with 30 second timeout
  const controller = new AbortController();
  abortControllerRef.current = controller;
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch('http://localhost:8000/v1/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: outputText, lang: language }),
      signal: controller.signal  // Enables timeout and cancellation
    });
    
    clearTimeout(timeoutId);
    
    const { audio_base64 } = await response.json();
    
    // Check if this request is still current (prevents race condition)
    if (currentRequestIdRef.current !== requestId) {
      return;
    }
    
    const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };
    
    audio.play();
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Check if aborted by user or timeout
    if (err instanceof Error && err.name === 'AbortError') {
      if (currentRequestIdRef.current !== requestId) return;
      console.warn('TTS API request timed out after 30 seconds');
    }
    
    // Fallback to browser TTS if still current request
    if (currentRequestIdRef.current !== requestId) return;
    
    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }
};
```

### Button UI

```tsx
<Button
  size="lg"
  variant={isSpeaking ? "default" : "outline"}
  onClick={handleSpeak}
>
  {isSpeaking ? (
    <>
      <VolumeX className="w-5 h-5" />
      {t('stopReading')}
    </>
  ) : (
    <>
      <Volume2 className="w-5 h-5" />
      {t('readAloud')}
    </>
  )}
</Button>
```

### Translations

```typescript
// In LanguageContext.tsx
readAloud: { en: 'Read this text aloud', de: 'Diesen Text vorlesen' },
stopReading: { en: 'Stop reading', de: 'Vorlesen stoppen' },
```

---

## Testing

### API Testing (curl)

```bash
# Test German TTS
curl -X POST http://localhost:8000/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hallo, das ist ein Test.", "lang": "de"}' | jq .

# Test English TTS
curl -X POST http://localhost:8000/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test.", "lang": "en"}' | jq .

# Save and play audio (macOS)
curl -X POST http://localhost:8000/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test audio", "lang": "en"}' \
  | jq -r .audio_base64 | base64 -d > test.mp3 && afplay test.mp3
```

### Frontend Testing

| Test Case | Expected Behavior |
|-----------|------------------|
| Click "Read Aloud" | Button changes to "Stop reading", audio plays |
| Click "Stop reading" | Audio stops, button changes back |
| Refresh page while playing | Audio stops immediately |
| Rapid double-click | Only one audio stream plays |
| API unavailable | Falls back to browser TTS |

### Error Cases

| Test Case | Expected Response |
|-----------|------------------|
| Empty text `""` | 400 - String should have at least 1 character |
| Invalid language `"fr"` | 400 - String should match pattern `^(de|en)$` |
| Text > 5000 chars | 400 - String should have at most 5000 characters |
| Network unavailable | 503 - TTS generation failed |

---

## Dependencies

**Backend:**
- `gTTS>=2.5.0` - Google Text-to-Speech library

**Frontend:**
- `lucide-react` - Icons (Volume2, VolumeX)

**Notes:**
- gTTS requires internet access to generate audio
- Audio quality is suitable for accessibility use cases
- For higher quality, consider OpenAI TTS or Google Cloud TTS (paid)

---

## Bug Fixes Applied

### Race Condition Prevention
**Problem:** If a user clicked "Read Aloud", stopped, then clicked again before the first API response arrived, both audio responses would play.

**Solution:** Each request is assigned a unique incrementing ID (`currentRequestIdRef`). When a response arrives, it's only played if its ID matches the current ID. Stopping or starting a new request increments the ID, invalidating old responses.

### Request Timeout
**Problem:** The fetch call had no timeout. If the backend hung, the UI would wait indefinitely.

**Solution:** Added `AbortController` with a 30-second timeout. If the request takes longer than 30 seconds, it's aborted and falls back to browser TTS.

---

## What This Implementation Does NOT Include

- **No file storage**: Audio is not saved to disk
- **No caching**: Each request generates fresh audio
- **No simplification**: TTS only reads text; it does not simplify it
- **No voice selection**: Uses default gTTS voice per language
- **No playback speed control**: Fixed at normal speed

---

## Future Enhancements (Optional)

- [ ] Add playback speed control (0.5x, 1x, 1.5x)
- [ ] Add voice selection (if using paid TTS providers)
- [ ] Add progress indicator during long audio generation
- [ ] Add keyboard shortcut for play/stop (e.g., Ctrl+Shift+S)

---

*Document created: 2026-01-20*  
*Last updated: 2026-01-22*
