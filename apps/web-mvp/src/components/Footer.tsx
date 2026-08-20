import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto bg-[hsl(174,50%,50%)] text-white border-t">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-sm font-medium tracking-wide opacity-90">
            {t('footerTagline')}
          </p>
          <p className="text-sm opacity-90 max-w-xl">
            {t('footerDisclaimer')}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <p className="text-sm opacity-90">
            {t('footerCopyright')}
          </p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label={t('footerLegalNav')}>
            <a
              href="/privacy"
              className="text-sm text-white underline underline-offset-4 opacity-90 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm"
            >
              {t('privacyPolicy')}
            </a>
            <a
              href="/impressum"
              className="text-sm text-white underline underline-offset-4 opacity-90 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm"
            >
              {t('imprint')}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
