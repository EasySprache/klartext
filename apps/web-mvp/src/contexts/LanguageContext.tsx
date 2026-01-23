import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'en' | 'de';

interface Translations {
    [key: string]: {
        en: string;
        de: string;
    };
}

const translations: Translations = {
    // Focus Mode - Language Selection
    welcomeTitle: { en: 'Welcome', de: 'Willkommen' },
    languageQuestion: { en: 'What language do you want to read?', de: 'In welcher Sprache möchtest du lesen?' },
    english: { en: 'English', de: 'Englisch' },
    german: { en: 'German', de: 'Deutsch' },

    // Focus Mode - Input Section
    inputQuestion: { en: 'How do you want to add your text?', de: 'Wie möchtest du deinen Text hinzufügen?' },
    uploadPdf: { en: 'I have a PDF file', de: 'Ich habe eine PDF-Datei' },
    pasteText: { en: 'I will paste text', de: 'Ich füge Text ein' },
    pasteHere: { en: 'Paste your text here', de: 'Füge deinen Text hier ein' },
    characterCount: { en: 'characters', de: 'Zeichen' },

    // Focus Mode - Action Section
    actionTitle: { en: 'Ready to simplify', de: 'Bereit zum Vereinfachen' },
    simplifyButton: { en: 'Simplify this text now', de: 'Diesen Text jetzt vereinfachen' },
    processing: { en: 'Working on it...', de: 'Wird verarbeitet...' },

    // Focus Mode - Result Section
    resultTitle: { en: 'Here is your simplified text', de: 'Hier ist dein vereinfachter Text' },
    scrollUpHint: { en: 'Scroll up to see what you wrote', de: 'Nach oben scrollen um deinen Original-Text zu sehen' },
    copyText: { en: 'Copy this text', de: 'Diesen Text kopieren' },
    readAloud: { en: 'Read this text aloud', de: 'Diesen Text vorlesen' },
    stopReading: { en: 'Stop reading', de: 'Vorlesen stoppen' },
    copied: { en: 'Text copied!', de: 'Text kopiert!' },

    // Progress indicators
    step1: { en: 'Choose language', de: 'Sprache wählen' },
    step2: { en: 'Add text', de: 'Text hinzufügen' },
    step3: { en: 'Simplify', de: 'Vereinfachen' },
    step4: { en: 'Read result', de: 'Ergebnis lesen' },

    // Accessibility Panel
    accessibilitySettings: { en: 'Accessibility Settings', de: 'Barrierefreiheit-Einstellungen' },
    textSize: { en: 'Text Size', de: 'Textgröße' },
    smaller: { en: 'Smaller', de: 'Kleiner' },
    larger: { en: 'Larger', de: 'Größer' },
    moreSpace: { en: 'More Space Between Lines', de: 'Mehr Zeilenabstand' },
    dyslexiaFont: { en: 'Dyslexia-Friendly Font', de: 'Legasthenie-freundliche Schrift' },
    highContrast: { en: 'High Contrast', de: 'Hoher Kontrast' },

    // Errors
    uploadError: { en: 'Could not read the PDF file', de: 'Die PDF-Datei konnte nicht gelesen werden' },
    simplifyError: { en: 'Something went wrong. Please try again.', de: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' },
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    const t = (key: string): string => {
        return translations[key]?.[language] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
