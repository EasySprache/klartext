import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer id="contact" className="py-12 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl mb-8">
            {t('footerMission')}
          </p>

          <nav className="flex flex-wrap justify-center gap-6 mb-8" aria-label="Footer navigation">
            <a
              href="#accessibility"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            >
              {t('accessibilityStatement')}
            </a>
            <a
              href="#privacy"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            >
              {t('privacy')}
            </a>
            <a
              href="mailto:hello@easylang.com"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            >
              {t('contact')}
            </a>
          </nav>

          <p className="text-primary-foreground/70">
            © 2024 EasyLang. Made for everyone.
          </p>
        </div>
      </div>
    </footer>
  );
}
