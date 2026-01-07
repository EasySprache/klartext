import { ClipboardPaste, Sparkles, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: ClipboardPaste,
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      icon: Sparkles,
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      icon: BookOpen,
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          {t('howItWorksTitle')}
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
          {t('step1Desc')}
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="p-8 text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <step.icon className="w-8 h-8 text-secondary" aria-hidden="true" />
              </div>
              <div className="text-4xl font-display font-bold text-muted-foreground/50 mb-2">
                {index + 1}
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
