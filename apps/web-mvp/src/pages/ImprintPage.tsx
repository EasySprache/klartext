import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Footer } from '@/components/Footer';
import { ImprintContent } from '@/components/ImprintContent';
import logoImg from '@/assets/logo.png';

export function ImprintPage() {
  const { t, language } = useLanguage();

  useEffect(() => {
    document.title = `${t('imprint')} – KlarText`;
    document.documentElement.lang = language;
  }, [language, t]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-[hsl(174,50%,50%)] text-white border-b h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <a
            href="/"
            className="flex flex-col items-start justify-center gap-0.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <img src={logoImg} alt="KlarText" className="h-9 w-auto object-contain" />
            <span className="font-display text-xs font-medium tracking-wide opacity-90 hidden sm:inline-block">
              {t('footerTagline')}
            </span>
          </a>
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <a
          href="/"
          className="inline-block mb-6 text-sm underline underline-offset-4 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
        >
          {t('backToKlarText')}
        </a>
        <h1 className="font-display text-3xl font-semibold mb-6">
          {t('imprintTitle')}
        </h1>
        <ImprintContent />
      </main>

      <Footer />
    </div>
  );
}
