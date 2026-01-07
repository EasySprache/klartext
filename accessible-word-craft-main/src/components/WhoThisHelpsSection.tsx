import { Brain, Eye, GraduationCap, Clock, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WhoThisHelpsSection() {
  const { t } = useLanguage();

  const audiences = [
    { icon: Brain, label: t('learningDisabilities') },
    { icon: Clock, label: t('slowReaders') },
    { icon: Eye, label: t('seniors') },
    { icon: GraduationCap, label: t('languageLearners') },
    { icon: Globe, label: t('clearTextUsers') },
  ];

  return (
    <section id="who-this-helps" className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          {t('whoThisHelps')}
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
          {t('footerMission')}
        </p>

        <div className="max-w-3xl mx-auto">
          <ul className="space-y-4" role="list">
            {audiences.map((audience, index) => (
              <li
                key={index}
                className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border"
              >
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <audience.icon className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <span className="text-lg text-foreground">{audience.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
