import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
      <Button
        variant={language === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className="min-w-[60px]"
      >
        EN
      </Button>
      <Button
        variant={language === 'de' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLanguage('de')}
        aria-pressed={language === 'de'}
        className="min-w-[60px]"
      >
        DE
      </Button>
    </div>
  );
}
