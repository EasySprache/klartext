import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HeroSection() {
  const { t } = useLanguage();
  
  return (
    <section id="home" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            {t('heroSubtitle')}
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            asChild
          >
            <a href="#translate">
              <ArrowDown className="w-5 h-5 mr-2" aria-hidden="true" />
              {t('startNow')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
