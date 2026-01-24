import { Info, AlertCircle } from 'lucide-react';

interface InfoWarningProps {
    title: string;
    message: string;
    variant?: 'info' | 'caution';
    icon?: React.ReactNode;
}

export function InfoWarning({
    title,
    message,
    variant = 'info',
    icon
}: InfoWarningProps) {
    const isInfo = variant === 'info';

    // Color schemes based on variant
    const bgColor = isInfo ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20';
    const borderColor = isInfo ? 'border-blue-200 dark:border-blue-800' : 'border-amber-200 dark:border-amber-800';
    const accentColor = isInfo ? 'border-l-blue-500' : 'border-l-amber-500';
    const iconColor = isInfo ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';
    const textColor = isInfo ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100';

    const DefaultIcon = isInfo ? Info : AlertCircle;
    const IconComponent = icon || <DefaultIcon className="h-4 w-4" />;

    return (
        <div
            className={`flex gap-3 p-3 rounded-lg border border-l-4 ${bgColor} ${borderColor} ${accentColor}`}
            role="alert"
            aria-live="polite"
        >
            <div className={`flex-shrink-0 ${iconColor} mt-0.5`}>
                {IconComponent}
            </div>
            <div className="flex-1 space-y-1">
                <h3 className={`text-sm font-semibold ${textColor}`}>
                    {title}
                </h3>
                <p className={`text-sm leading-relaxed ${textColor} opacity-90`}>
                    {message}
                </p>
            </div>
        </div>
    );
}
