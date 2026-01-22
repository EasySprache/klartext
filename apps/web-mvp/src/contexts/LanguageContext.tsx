import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'de';

interface Translations {
    [key: string]: {
        en: string;
        de: string;
    };
}

const translations: Translations = {
    // Navigation & General
    languageQuestion: { en: 'What language do you want to read?', de: 'In welcher Sprache möchtest du lesen?' },
    toggleEnglish: { en: 'I speak English', de: 'I speak English' },
    toggleGerman: { en: 'Ich spreche Deutsch', de: 'Ich spreche Deutsch' },

    // Chapters
    chapterWelcome: { en: 'What is Klartext?', de: 'Was ist Klartext?' },
    chapterInput: { en: 'Enter the text you don’t understand', de: 'Geben Sie den Text ein, den Sie nicht verstehen' },
    chapterOutput: { en: 'Read or hear what the text says in easy language', de: 'Lesen oder hören Sie, was der Text in einfacher Sprache sagt' },

    // Welcome Step (PRESERVED)
    welcomeIntro: { en: 'Klartext helps you understand texts that are hard to read or confusing.', de: 'Klartext hilft Ihnen, Texte zu verstehen, die schwer zu lesen oder verwirrend sind.' },
    welcomeUseFor: { en: 'You can use it for letters, documents, or any text you don’t fully understand.', de: 'Sie können es für Briefe, Dokumente oder jeden Text verwenden, den Sie nicht vollständig verstehen.' },
    welcomeStep1Title: { en: '1. Add your text', de: '1. Text hinzufügen' },
    welcomeStep1Desc: { en: 'Paste text or upload a document that is difficult to understand.', de: 'Fügen Sie Text ein oder laden Sie ein Dokument hoch, das schwer verständlich ist.' },
    welcomeStep2Title: { en: '2. Klartext makes it easier', de: '2. Klartext macht es einfacher' },
    welcomeStep2Desc: { en: 'We rewrite the text in clear, simple language while keeping the meaning.', de: 'Wir schreiben den Text in klarer, einfacher Sprache neu, während die Bedeutung erhalten bleibt.' },
    welcomeStep3Title: { en: '3. Read or listen', de: '3. Lesen oder hören' },
    welcomeStep3Desc: { en: 'Read the easier version or listen to it being read aloud.', de: 'Lesen Sie die einfachere Version oder lassen Sie sich den Text vorlesen.' },
    startAction: { en: 'OK, let’s start', de: 'OK, lass uns anfangen' },

    // Input Section
    inputQuestion: { en: 'How do you want to add your text?', de: 'Wie möchtest du deinen Text hinzufügen?' },
    uploadPdf: { en: 'I have a PDF file', de: 'Ich habe eine PDF-Datei' },
    pasteTextOption: { en: 'I will paste text', de: 'Ich werde Text einfügen' },
    pasteHere: { en: 'Paste your text here', de: 'Füge deinen Text hier ein' },
    characterCount: { en: 'characters', de: 'Zeichen' },
    simplifyButton: { en: 'Simplify this text now', de: 'Diesen Text jetzt vereinfachen' },
    processing: { en: 'Working on it...', de: 'Wird verarbeitet...' },

    // Result Section
    resultTitle: { en: 'Here is your simplified text', de: 'Hier ist dein vereinfachter Text' },
    copyText: { en: 'Copy this text', de: 'Diesen Text kopieren' },
    readAloud: { en: 'Read this text aloud', de: 'Diesen Text vorlesen' },
    copied: { en: 'Text copied!', de: 'Text kopiert!' },
    startAgain: { en: 'Start again', de: 'Neu starten' },
    scrollUpHint: { en: 'Scroll up to see what you wrote', de: 'Nach oben scrollen um deinen Original-Text zu sehen' },

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
