import { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, FileText, Type, Loader2, Copy, Check, Volume2, VolumeX, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import ProgressIndicator from '@/components/ProgressIndicator';
import PasswordGate from '@/components/PasswordGate';
import { apiJsonRequest, apiRequest } from '@/lib/api';

type InputMethod = 'pdf' | 'paste' | null;
type FlowStep = 1 | 2 | 3 | 4;

function App() {
  const { language, setLanguage, t } = useLanguage();

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>(1);
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs for scrolling
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  
  // Ref for audio element to allow stopping
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Ref to track the current request ID (prevents race conditions with multiple requests)
  const currentRequestIdRef = useRef<number>(0);
  
  // Ref for AbortController to cancel pending fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll into view helper
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Handle language selection
  const handleLanguageSelect = (lang: 'en' | 'de') => {
    setLanguage(lang);
    setCurrentStep(2);
    scrollToSection(section2Ref);
  };

  // Handle input method selection
  const handleInputMethodSelect = (method: InputMethod) => {
    setInputMethod(method);
    if (method === 'pdf') {
      document.getElementById('pdf-upload')?.click();
    }
  };

  // Handle PDF upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError(t('uploadError'));
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest('/v1/ingest/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setInputText(data.extracted_text);
      setCurrentStep(3);
      scrollToSection(section3Ref);
    } catch (err) {
      console.error("Upload error:", err);
      setError(t('uploadError'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Update step when text is entered
  useEffect(() => {
    if (inputMethod === 'paste' && inputText.trim().length > 0 && currentStep === 2) {
      setCurrentStep(3);
      scrollToSection(section3Ref);
    }
  }, [inputText, inputMethod, currentStep]);

  // Handle simplification
  const handleSimplify = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiJsonRequest('/v1/simplify', {
        text: inputText,
        target_lang: language,
        level: 'easy'
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      setOutputText(data.simplified_text);
      setCurrentStep(4);
      scrollToSection(section4Ref);
    } catch (err) {
      console.error("Simplification failed:", err);
      setError(t('simplifyError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stop all audio playback
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

  // Cleanup on unmount or page refresh
  useEffect(() => {
    // Stop audio when component unmounts
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Also stop on page visibility change (e.g., tab switch) or before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopSpeaking();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopSpeaking]);

  // Handle read aloud - uses API TTS with browser fallback
  const handleSpeak = async () => {
    // If already speaking, stop instead
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    
    if (!outputText) return;
    
    // SAFETY: Always stop any existing audio before starting new playback
    // This prevents multiple audio loops even if state gets out of sync
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
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
      // Try API TTS first for consistent voice quality
      const response = await apiJsonRequest('/v1/tts', { 
        text: outputText, 
        lang: language 
      }, 'POST', controller.signal);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }
      
      const { audio_base64 } = await response.json();
      
      // SAFETY: Check if this request is still the current one
      // Prevents race condition where old request plays after new one started
      if (currentRequestIdRef.current !== requestId) {
        return; // A newer request was started, discard this response
      }
      
      const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
      audioRef.current = audio;
      
      // Reset speaking state when audio ends
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      audio.play();
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Check if this was an abort (user stopped or timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        // Check if this was a timeout vs user-initiated abort
        if (currentRequestIdRef.current === requestId) {
          console.warn('TTS API request timed out after 30 seconds');
          // Fall through to browser TTS fallback
        } else {
          // User initiated a new request, don't fall back
          return;
        }
      } else {
        console.warn('API TTS failed, falling back to browser TTS:', err);
      }
      
      // SAFETY: Check if this request is still current before fallback
      if (currentRequestIdRef.current !== requestId) {
        return;
      }
      
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(outputText);
        utterance.rate = 0.9;
        utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
        
        // Reset speaking state when utterance ends
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    }
  };

  return (
    <PasswordGate>
      <div className="min-h-screen bg-background">
        {/* Skip link */}
        <a href="#main" className="skip-link">
          {language === 'de' ? 'Zum Inhalt springen' : 'Skip to content'}
        </a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b pb-2">
        <div className="container mx-auto px-4 pt-3">
          {/* Top Row: Badge and Settings */}
          <div className="flex justify-between items-center mb-1">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg font-display font-bold text-sm leading-none shadow-sm transform -rotate-2 border-2 border-primary/20 origin-left">
              Ja klar!
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAccessibilityOpen(true)}
              aria-label={t('accessibilitySettings')}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom Row: Title and Progress */}
          <div className="relative flex items-center h-14">
            <span className="font-display text-4xl font-bold text-foreground tracking-tight z-10">
              Klartext
            </span>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto">
                <ProgressIndicator currentStep={currentStep} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="container mx-auto px-4 py-8 space-y-12">

        {/* Section 1: Language Selection */}
        <section
          className="section-reveal visible"
          aria-labelledby="section1-title"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle id="section1-title" className="text-2xl md:text-3xl font-display">
                {t('languageQuestion')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                variant={language === 'en' && currentStep > 1 ? 'default' : 'outline'}
                onClick={() => handleLanguageSelect('en')}
                className="min-w-[180px] flex-col h-auto py-6 gap-2"
              >
                <span className="text-4xl">🇬🇧</span>
                <span className="text-xl font-medium">{t('english')}</span>
              </Button>
              <Button
                size="xl"
                variant={language === 'de' && currentStep > 1 ? 'default' : 'outline'}
                onClick={() => handleLanguageSelect('de')}
                className="min-w-[180px] flex-col h-auto py-6 gap-2"
              >
                <span className="text-4xl">🇩🇪</span>
                <span className="text-xl font-medium">{t('german')}</span>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: Input Method */}
        <section
          ref={section2Ref}
          className={`section-reveal ${currentStep >= 2 ? 'visible' : ''}`}
          aria-labelledby="section2-title"
          aria-hidden={currentStep < 2}
        >
          {currentStep >= 2 && (
            <Card className="max-w-3xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle id="section2-title" className="text-2xl md:text-3xl font-display">
                  {t('inputQuestion')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Input method buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="xl"
                    variant={inputMethod === 'pdf' ? 'default' : 'outline'}
                    onClick={() => handleInputMethodSelect('pdf')}
                    disabled={isUploading}
                    className="min-w-[200px] flex items-center gap-3"
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                    <span>{isUploading ? t('processing') : t('uploadPdf')}</span>
                  </Button>
                  <Button
                    size="xl"
                    variant={inputMethod === 'paste' ? 'default' : 'outline'}
                    onClick={() => handleInputMethodSelect('paste')}
                    className="min-w-[200px] flex items-center gap-3"
                  >
                    <Type className="w-6 h-6" />
                    <span>{t('pasteText')}</span>
                  </Button>
                </div>

                {/* Hidden PDF input */}
                <input
                  type="file"
                  id="pdf-upload"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />

                {/* Text area - shown when paste is selected OR when PDF was uploaded */}
                {(inputMethod === 'paste' || inputText) && (
                  <div className="space-y-3">
                    <Label htmlFor="input-text" className="text-lg font-medium">
                      {t('pasteHere')}
                    </Label>
                    <Textarea
                      id="input-text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('pasteHere')}
                      className="min-h-[200px] text-lg resize-none"
                    />
                    <p className="text-sm text-muted-foreground text-right">
                      {inputText.length} {t('characterCount')}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-center">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 3: Action Button */}
        <section
          ref={section3Ref}
          className={`section-reveal ${currentStep >= 3 ? 'visible' : ''}`}
          aria-labelledby="section3-title"
          aria-hidden={currentStep < 3}
        >
          {currentStep >= 3 && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle id="section3-title" className="text-2xl md:text-3xl font-display">
                  {t('actionTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button
                  size="xl"
                  onClick={handleSimplify}
                  disabled={isLoading || !inputText.trim()}
                  className="text-xl px-12 py-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('simplifyButton')
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 4: Result */}
        <section
          ref={section4Ref}
          className={`section-reveal ${currentStep >= 4 ? 'visible' : ''}`}
          aria-labelledby="section4-title"
          aria-hidden={currentStep < 4}
        >
          {currentStep >= 4 && outputText && (
            <Card className="max-w-3xl mx-auto border-secondary border-2">
              <CardHeader className="text-center">
                <CardTitle id="section4-title" className="text-2xl md:text-3xl font-display text-secondary">
                  {t('resultTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Result text */}
                <div className="p-6 bg-muted/50 rounded-lg">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {outputText}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleCopy}
                    className="flex items-center gap-2"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? t('copied') : t('copyText')}
                  </Button>
                  <Button
                    size="lg"
                    variant={isSpeaking ? "default" : "outline"}
                    onClick={handleSpeak}
                    className="flex items-center gap-2"
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
                </div>

                {/* Scroll up hint */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground pt-4">
                  <ArrowUp className="w-5 h-5" />
                  <span>{t('scrollUpHint')}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

      </main>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        open={accessibilityOpen}
        onOpenChange={setAccessibilityOpen}
      />
    </div>
    </PasswordGate>
  );
}

export default App;
