import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SidebarNavProps {
    activeSection: string;
    className?: string;
    onNavigate: (sectionId: string) => void;
    completedSections: string[];
}

export function SidebarNav({ activeSection, className, onNavigate, completedSections }: SidebarNavProps) {
    const { t } = useLanguage();

    const items = [
        { id: 'welcome', title: t('chapterWelcome') },
        { id: 'input', title: t('chapterInput') },
        { id: 'output', title: t('chapterOutput') },
    ];

    return (
        <nav className={cn("flex flex-col gap-2 w-64 flex-shrink-0", className)}>
            {items.map((item) => {
                const isActive = activeSection === item.id;
                const isCompleted = completedSections.includes(item.id);

                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                            "flex items-start gap-3 p-3 rounded-lg text-left transition-colors relative",
                            isActive
                                ? "bg-slate-100 text-slate-900 font-medium"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            isActive ? "border-primary bg-background" : "border-slate-300",
                            isCompleted && !isActive && "bg-green-100 border-green-500"
                        )}>
                            {isCompleted && !isActive && (
                                <Check className="w-3 h-3 text-green-600" />
                            )}
                            {isActive && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                        </div>
                        <span className="text-sm leading-tight">{item.title}</span>
                    </button>
                );
            })}
        </nav>
    );
}
