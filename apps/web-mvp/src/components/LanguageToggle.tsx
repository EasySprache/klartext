import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="flex bg-slate-100 p-1 rounded-full">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('en')}
                className={cn(
                    "rounded-full gap-2 px-4 transition-all",
                    language === 'en'
                        ? "bg-white text-foreground shadow-sm hover:bg-white"
                        : "text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                )}
            >
                <span className="text-lg">🇬🇧</span>
                <span className="font-medium text-sm">{t('toggleEnglish')}</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage('de')}
                className={cn(
                    "rounded-full gap-2 px-4 transition-all",
                    language === 'de'
                        ? "bg-white text-foreground shadow-sm hover:bg-white"
                        : "text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                )}
            >
                <span className="text-lg">🇩🇪</span>
                <span className="font-medium text-sm">{t('toggleGerman')}</span>
            </Button>
        </div>
    );
}
