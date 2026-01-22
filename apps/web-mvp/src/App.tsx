import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Loader2, Copy, Check, Volume2, VolumeX, Wand2, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import { SidebarNav } from '@/components/SidebarNav';
import { LanguageToggle } from '@/components/LanguageToggle';

type InputMethod = 'pdf' | 'paste';

function App() {
  const { language, t } = useLanguage();

  // State
  const [activeSection, setActiveSection] = useState('welcome');
  const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
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
  const welcomeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Ref for audio element to allow stopping
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ref to track the current request ID (prevents race conditions with multiple requests)
  const currentRequestIdRef = useRef<number>(0);

  // Ref for AbortController to cancel pending fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sections config for navigation
  const sections = [
    { id: 'welcome', ref: welcomeRef },
    { id: 'input', ref: inputRef },
    { id: 'output', ref: outputRef },
  ];

  // Scroll handler
  const scrollToSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.ref.current) {
      section.ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Intersection Observer to update active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 } // Trigger when 30% of section is visible
    );

    sections.forEach((section) => {
      if (section.ref.current) observer.observe(section.ref.current);
    });

    return () => observer.disconnect();
  }, []);

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
      const response = await fetch('http://localhost:8000/v1/ingest/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setInputText(data.extracted_text);
      // Auto-switch to paste view to show extracted text
      setInputMethod('paste');
    } catch (err) {
      console.error("Upload error:", err);
      setError(t('uploadError'));
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Handle simplification
  const handleSimplify = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/v1/simplify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          target_lang: language,
          level: 'easy'
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      setOutputText(data.simplified_text);

      // Allow DOM update then scroll
      setTimeout(() => scrollToSection('output'), 100);

    } catch (err) {
      console.error("Simplification failed:", err);
      setError(t('simplifyError'));
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await fetch('http://localhost:8000/v1/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: outputText, lang: language }),
        signal: controller.signal
      });

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

  const handleStartAgain = () => {
    setInputText('');
    setOutputText('');
    setError(null);
    setInputMethod('paste');
    scrollToSection('input');
  };

  // Check completion status for sidebar checkmarks
  const completedSections = [];
  if (inputText.length > 0) completedSections.push('input');
  if (outputText.length > 0) completedSections.push('output');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg font-display font-bold text-sm leading-none shadow-sm transform -rotate-2 border-2 border-primary/20 origin-left">
              Ja klar!
            </div>
            <span className="font-display text-2xl font-bold text-foreground tracking-tight">
              Klartext
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccessibilityOpen(true)}
              aria-label={t('accessibilitySettings')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8 flex gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block sticky top-24">
          <SidebarNav
            activeSection={activeSection}
            onNavigate={scrollToSection}
            completedSections={completedSections}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-24 max-w-3xl pb-24">

          {/* Section 1: Welcome */}
          <section id="welcome" ref={welcomeRef} className="scroll-mt-24 space-y-8">
            <div className="space-y-6 text-center">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-primary leading-tight">
                {t('welcomeIntro')}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {t('welcomeUseFor')}
              </p>
            </div>

            {/* Visual Steps (PRESERVED EXACTLY AS IS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative py-8">
              {/* Arrows for Desktop */}
              <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
                <svg className="absolute top-8 left-[28%] w-[14%] h-12 text-muted-foreground/30" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M 0,30 Q 50,0 100,30" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M 95,25 L 100,30 L 95,35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg className="absolute top-8 left-[60%] w-[14%] h-12 text-muted-foreground/30" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M 0,10 Q 50,40 100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M 95,5 L 100,10 L 95,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Step 1 */}
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold mb-1">{t('welcomeStep1Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('welcomeStep1Desc')}</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-16 h-16 rounded-full bg-purple-50 border-2 border-purple-100 flex items-center justify-center text-purple-500">
                  <Wand2 className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold mb-1">{t('welcomeStep2Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('welcomeStep2Desc')}</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center text-green-500">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold mb-1">{t('welcomeStep3Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('welcomeStep3Desc')}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                size="xl"
                onClick={() => scrollToSection('input')}
                className="rounded-full px-12 py-6 text-xl font-display shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                {t('startAction')}
              </Button>
            </div>
          </section>

          {/* Section 2: Input */}
          <section id="input" ref={inputRef} className="scroll-mt-24">
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-display text-center">
                  {t('inputQuestion')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Method Selection - Visible Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setInputMethod('paste')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${inputMethod === 'paste' ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${inputMethod === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-white border'}`}>
                      {inputMethod === 'paste' && <Check className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold">{t('pasteTextOption')}</h4>
                      <p className="text-xs text-muted-foreground">Type or paste directly</p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setInputMethod('pdf');
                      // Trigger hidden file input if clicking this card
                      document.getElementById('pdf-upload')?.click();
                    }}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${inputMethod === 'pdf' ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${inputMethod === 'pdf' ? 'bg-primary text-primary-foreground' : 'bg-white border'}`}>
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (inputMethod === 'pdf' ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5 text-muted-foreground" />)}
                    </div>
                    <div>
                      <h4 className="font-bold">{t('uploadPdf')}</h4>
                      <p className="text-xs text-muted-foreground">{isUploading ? t('processing') : 'Upload a PDF file'}</p>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  id="pdf-upload"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />

                <div className="space-y-4">
                  <Label htmlFor="input-text" className="sr-only">{t('pasteHere')}</Label>
                  <Textarea
                    id="input-text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('pasteHere')}
                    className="min-h-[240px] text-lg p-6 resize-none bg-background border-slate-200 focus:border-primary/50"
                  />
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{inputText.length > 0 ? `${inputText.length} ${t('characterCount')}` : ''}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center font-medium">
                    {error}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    size="xl"
                    className="w-full py-8 text-xl font-display shadow-sm"
                    disabled={!inputText.trim() || isLoading}
                    onClick={handleSimplify}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      t('simplifyButton')
                    )}
                  </Button>

                </div >
              </CardContent >
            </Card >
          </section >

          {/* Section 3: Output */}
          < section id="output" ref={outputRef} className="scroll-mt-24 min-h-[400px]" >
            {
              outputText ? (
                <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700" >
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-display text-primary">
                      {t('resultTitle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 p-8">
                    <div className="bg-background rounded-xl p-8 shadow-sm border border-primary/10">
                      <p className="text-xl leading-relaxed whitespace-pre-wrap font-medium text-foreground">
                        {outputText}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button variant="outline" size="lg" onClick={handleCopy} className="gap-2">
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? t('copied') : t('copyText')}
                      </Button>
                      <Button variant={isSpeaking ? "default" : "outline"} size="lg" onClick={handleSpeak} className="gap-2"
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

                    <div className="border-t pt-8 mt-8 text-center">
                      <Button
                        variant="ghost"
                        onClick={handleStartAgain}
                        className="text-muted-foreground hover:text-foreground hover:bg-slate-100"
                      >
                        {t('startAgain')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                  <p>{t('chapterOutput')}</p>
                  <span className="text-sm mt-2 opacity-50">(Waiting for text)</span>
                </div>
              )
            }
          </section >

        </main >
      </div >

      <AccessibilityPanel
        open={accessibilityOpen}
        onOpenChange={setAccessibilityOpen}
      />
    </div >
  );
}

export default App;
