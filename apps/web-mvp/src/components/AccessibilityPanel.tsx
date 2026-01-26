import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Minus, Plus, Type, AlignJustify, Eye } from 'lucide-react';

interface AccessibilityPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AccessibilityPanel({ open, onOpenChange }: AccessibilityPanelProps) {
    const {
        fontSize,
        increasedSpacing,
        increasedWordSpacing,
        dyslexiaFont,
        highContrast,
        increaseFontSize,
        decreaseFontSize,
        toggleSpacing,
        toggleWordSpacing,
        toggleDyslexiaFont,
        toggleHighContrast,
    } = useAccessibility();
    const { t } = useLanguage();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-80 sm:w-96">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-display">{t('makeTextEasier')}</SheetTitle>
                </SheetHeader>

                <div className="mt-8 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-lg font-medium flex items-center gap-2">
                            <Type className="w-5 h-5" aria-hidden="true" />
                            {t('textSize')}
                        </Label>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={decreaseFontSize}
                                aria-label={t('smaller')}
                                disabled={fontSize <= 14}
                            >
                                <Minus className="w-5 h-5" />
                                <span className="ml-1">A</span>
                            </Button>
                            <span className="text-lg font-medium min-w-[3rem] text-center">{fontSize}px</span>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={increaseFontSize}
                                aria-label={t('larger')}
                                disabled={fontSize >= 28}
                            >
                                <Plus className="w-5 h-5" />
                                <span className="ml-1">A</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="spacing" className="text-lg font-medium flex items-center gap-2">
                                <AlignJustify className="w-5 h-5" aria-hidden="true" />
                                {t('moreSpace')}
                            </Label>
                        </div>
                        <Switch
                            id="spacing"
                            checked={increasedSpacing}
                            onCheckedChange={toggleSpacing}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="word-spacing" className="text-lg font-medium flex items-center gap-2">
                                <AlignJustify className="w-5 h-5" aria-hidden="true" />
                                {t('moreWordSpace')}
                            </Label>
                        </div>
                        <Switch
                            id="word-spacing"
                            checked={increasedWordSpacing}
                            onCheckedChange={toggleWordSpacing}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="dyslexia" className="text-lg font-medium flex items-center gap-2">
                                <Type className="w-5 h-5" aria-hidden="true" />
                                {t('easierFont')}
                            </Label>
                        </div>
                        <Switch
                            id="dyslexia"
                            checked={dyslexiaFont}
                            onCheckedChange={toggleDyslexiaFont}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="contrast" className="text-lg font-medium flex items-center gap-2">
                                <Eye className="w-5 h-5" aria-hidden="true" />
                                {t('strongerColors')}
                            </Label>
                        </div>
                        <Switch
                            id="contrast"
                            checked={highContrast}
                            onCheckedChange={toggleHighContrast}
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
