import { useLanguage } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
    currentStep: number;
}

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
    const { t } = useLanguage();

    const steps = [
        { key: 'step1', number: 1 },
        { key: 'step2', number: 2 },
        { key: 'step3', number: 3 },
        { key: 'step4', number: 4 },
    ];

    return (
        <div className="flex items-center justify-center gap-2 py-4" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={4}>
            {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                    <div
                        className={`
              flex items-center justify-center w-10 h-10 rounded-full font-medium text-lg transition-all duration-300
              ${currentStep > step.number
                                ? 'bg-secondary text-secondary-foreground'
                                : currentStep === step.number
                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30'
                                    : 'bg-muted text-muted-foreground'
                            }
            `}
                        aria-label={`${t(step.key)}${currentStep === step.number ? ' - current step' : currentStep > step.number ? ' - completed' : ''}`}
                    >
                        {currentStep > step.number ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            step.number
                        )}
                    </div>

                    {index < steps.length - 1 && (
                        <div
                            className={`
                w-8 h-1 mx-1 rounded transition-all duration-300
                ${currentStep > step.number ? 'bg-secondary' : 'bg-muted'}
              `}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
