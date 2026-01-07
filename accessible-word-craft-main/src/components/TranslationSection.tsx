import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TranslationSection() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t, language } = useLanguage();

  const difficultyLevels = [
    { value: 'very-easy', label: t('veryEasy'), description: t('veryEasyDesc') },
    { value: 'easy', label: t('easy'), description: t('easyDesc') },
    { value: 'medium', label: t('medium'), description: t('mediumDesc') },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast({ title: t('originalText'), description: t('pasteTextHere') });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const demoOutputs: Record<string, Record<string, string>> = {
      en: {
        'very-easy': 'This is easy text. Short words. Easy to read.',
        'easy': 'This text is simple. It uses common words and short sentences.',
        'medium': 'This text has been simplified. It maintains meaning while using clearer language.',
      },
      de: {
        'very-easy': 'Das ist einfacher Text. Kurze Wörter. Leicht zu lesen.',
        'easy': 'Dieser Text ist einfach. Er nutzt einfache Wörter und kurze Sätze.',
        'medium': 'Dieser Text wurde vereinfacht. Er behält die Bedeutung mit klarerer Sprache.',
      },
    };
    
    setOutputText(demoOutputs[language]?.[difficulty] || demoOutputs['en']['easy']);
    setIsLoading(false);
    toast({ title: '✓', description: t('resultHere') });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast({ title: t('textCopied') });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window && outputText) {
      const utterance = new SpeechSynthesisUtterance(outputText);
      utterance.rate = 0.9;
      utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <section id="translate" className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          {t('translateYourText')}
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
          {t('pasteTextHere')}
        </p>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <Label htmlFor="input-text" className="text-lg font-medium mb-3 block">
                {t('originalText')}
              </Label>
              <Textarea
                id="input-text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={t('pasteTextHere')}
                className="min-h-[200px] text-lg resize-none"
                aria-describedby="input-hint"
              />
              <p id="input-hint" className="text-sm text-muted-foreground mt-2">
                {inputText.length} characters
              </p>
            </Card>

            <Card className="p-6">
              <Label htmlFor="output-text" className="text-lg font-medium mb-3 block">
                {t('easyLanguageVersion')}
              </Label>
              <Textarea
                id="output-text"
                value={outputText}
                readOnly
                placeholder={t('resultHere')}
                className="min-h-[200px] text-lg resize-none bg-muted/50"
              />
              {outputText && (
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? t('textCopied') : t('copyText')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSpeak}>
                    <Volume2 className="w-4 h-4 mr-1" />
                    {t('readAloud')}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="mb-8">
            <Label className="text-lg font-medium mb-4 block text-center">
              {t('chooseLevel')}
            </Label>
            <RadioGroup
              value={difficulty}
              onValueChange={setDifficulty}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              {difficultyLevels.map(level => (
                <Label
                  key={level.value}
                  htmlFor={level.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    difficulty === level.value
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border hover:border-secondary/50'
                  }`}
                >
                  <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                  <div>
                    <span className="font-medium block">{level.label}</span>
                    <span className="text-sm text-muted-foreground">{level.description}</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim()}
              className="text-xl px-10 py-7 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-2" aria-hidden="true" />
                  {t('makeItEasier')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
