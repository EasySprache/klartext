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
    stopReading: { en: 'Stop reading', de: 'Vorlesen stoppen' },
    copied: { en: 'Text copied!', de: 'Text kopiert!' },
    startAgain: { en: 'Start again', de: 'Neu starten' },
    scrollUpHint: { en: 'Scroll up to see what you wrote', de: 'Nach oben scrollen um deinen Original-Text zu sehen' },

    // Accessibility Panel
    makeTextEasier: { en: 'Make text easier to read', de: 'Text leichter lesbar machen' },
    textSize: { en: 'Text Size', de: 'Textgröße' },
    smaller: { en: 'Smaller', de: 'Kleiner' },
    larger: { en: 'Larger', de: 'Größer' },
    moreSpace: { en: 'More space between lines', de: 'Mehr Platz zwischen Zeilen' },
    moreWordSpace: { en: 'More space between words', de: 'Mehr Platz zwischen Wörtern' },
    easierFont: { en: 'Easier-to-read font', de: 'Leichter lesbare Schrift' },
    strongerColors: { en: 'Stronger colors', de: 'Stärkere Farben' },

    // Warnings
    privacyWarningTitle: { en: 'We need to tell you something', de: 'Wir müssen Ihnen etwas sagen' },
    privacyWarningText: {
        en: 'We save your text to make our tool better. Do not write private things like your name, address, or personal documents. (If you do not know what this means, you can paste it into the tool to make it easier to understand!)',
        de: 'Wir speichern Ihren Text, um unser Tool besser zu machen. Schreiben Sie keine privaten Dinge wie Ihren Namen, Ihre Adresse oder persönliche Dokumente. (Wenn Sie nicht wissen, was das bedeutet, können Sie es in das Tool einfügen, um es einfacher zu verstehen!)'
    },
    aiLimitationsTitle: { en: 'Be careful with this text', de: 'Seien Sie vorsichtig mit diesem Text' },
    aiLimitationsText: {
        en: 'A computer made this text. It can make mistakes. Do not use it for important things like legal papers or health questions. Ask an expert if you need help with something important.',
        de: 'Ein Computer hat diesen Text gemacht. Er kann Fehler machen. Verwenden Sie ihn nicht für wichtige Dinge wie rechtliche Papiere oder Gesundheitsfragen. Fragen Sie einen Experten, wenn Sie Hilfe bei etwas Wichtigem brauchen.'
    },

    // Errors
    uploadError: { en: 'Could not read the PDF file', de: 'Die PDF-Datei konnte nicht gelesen werden' },
    simplifyError: { en: 'Something went wrong. Please try again.', de: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' },

    // Footer
    footerTagline: { en: 'Easy Language for Everyone', de: 'Einfache Sprache für alle' },
    footerDisclaimer: {
        en: 'KlarText makes hard text easier to read. It is not official Easy Language (Leichte Sprache).',
        de: 'KlarText macht schwierige Texte leichter lesbar. Es ist keine offizielle Leichte Sprache.',
    },
    footerCopyright: { en: '© 2026 KlarText. Non-commercial use only.', de: '© 2026 KlarText. Nur für nicht-kommerzielle Nutzung.' },
    privacyPolicy: { en: 'Privacy Policy', de: 'Datenschutz' },
    privacyPolicyTitle: { en: 'How we use your text', de: 'Wie wir Ihren Text verwenden' },
    privacyPolicyP1: {
        en: 'We want you to know what happens to your text.',
        de: 'Wir möchten, dass Sie wissen, was mit Ihrem Text passiert.',
    },
    privacyPolicyP2: {
        en: 'When you paste text or upload a PDF, we send it to our server. A computer then rewrites it.',
        de: 'Wenn Sie Text einfügen oder eine PDF-Datei hochladen, senden wir sie an unseren Server. Ein Computer schreibt den Text dann um.',
    },
    privacyPolicyExtension: {
        en: 'If you use the KlarText browser extension, the same rules apply. When you click Simplify, we send the page text or the text you selected to our server.',
        de: 'Wenn Sie die KlarText-Browsererweiterung nutzen, gelten dieselben Regeln. Wenn Sie auf Vereinfachen klicken, senden wir den Seitentext oder den markierten Text an unseren Server.',
    },
    privacyPolicyExtensionLocal: {
        en: 'The extension only reads a page when you ask it to. It saves your language choice for that website on your computer. It does not save the page text on your computer.',
        de: 'Die Erweiterung liest eine Seite nur, wenn Sie sie dazu auffordern. Sie speichert Ihre Sprachwahl für diese Website auf Ihrem Computer. Sie speichert den Seitentext nicht auf Ihrem Computer.',
    },
    privacyPolicyP3: {
        en: 'We save your text only to make KlarText better. We do not sell your text. We do not give it to advertisers.',
        de: 'Wir speichern Ihren Text nur, um KlarText besser zu machen. Wir verkaufen Ihren Text nicht. Wir geben ihn nicht an Werbeunternehmen weiter.',
    },
    privacyPolicyP4: {
        en: 'To rewrite the text, our server sends it to Groq. Groq is the computer that makes the simple version.',
        de: 'Um den Text umzuschreiben, sendet unser Server ihn an Groq. Groq ist der Computer, der die einfache Fassung erstellt.',
    },
    privacyPolicyP5: {
        en: 'If you click “read this text aloud”, we send the simple text to Google. Google turns the words into speech.',
        de: 'Wenn Sie auf „Diesen Text vorlesen“ klicken, senden wir den einfachen Text an Google. Google macht aus den Worten Sprache.',
    },
    privacyPolicyP6: {
        en: 'Do not write private things like your name, address, or personal documents.',
        de: 'Schreiben Sie keine privaten Dinge wie Ihren Namen, Ihre Adresse oder persönliche Dokumente.',
    },
    privacyPolicyP7: {
        en: 'We do not use cookies.',
        de: 'Wir verwenden keine Cookies.',
    },
    privacyPolicyP8: {
        en: 'You do not need an account. We do not ask for your name.',
        de: 'Sie brauchen kein Konto. Wir fragen nicht nach Ihrem Namen.',
    },
    privacyHttps: {
        en: 'We send your text over a secure connection (HTTPS).',
        de: 'Wir senden Ihren Text über eine sichere Verbindung (HTTPS).',
    },
    privacyLimitedUse: {
        en: 'KlarText only uses your text to make it easier to read and to improve that feature. This follows the Chrome Web Store User Data Policy, including the Limited Use requirements.',
        de: 'KlarText nutzt Ihren Text nur, um ihn leichter lesbar zu machen und diese Funktion zu verbessern. Das folgt der Chrome Web Store User Data Policy, einschließlich der Limited Use-Anforderungen.',
    },
    backToKlarText: { en: 'Back to KlarText', de: 'Zurück zu KlarText' },
    footerLegalNav: { en: 'Legal pages', de: 'Rechtliche Seiten' },
    imprint: { en: 'Imprint', de: 'Impressum' },
    imprintTitle: { en: 'Who is responsible for KlarText', de: 'Wer ist verantwortlich für KlarText' },
    imprintP1: {
        en: 'This page says who is responsible for this website.',
        de: 'Diese Seite sagt, wer für diese Website verantwortlich ist.',
    },
    imprintP2: {
        en: 'A small team made KlarText. The person named below is the contact for this website.',
        de: 'Ein kleines Team hat KlarText gemacht. Die unten genannte Person ist der Kontakt für diese Website.',
    },
    imprintP3: {
        en: 'You can write an email if you have a question.',
        de: 'Sie können eine E-Mail schreiben, wenn Sie eine Frage haben.',
    },
    imprintLegalHeading: { en: 'Legal information', de: 'Angaben gemäß § 5 DDG' },
    imprintResponsible: { en: 'Responsible person', de: 'Verantwortlich' },
    imprintAddress: { en: 'Address', de: 'Adresse' },
    imprintEmail: { en: 'Email', de: 'E-Mail' },
    imprintCountry: { en: 'Germany', de: 'Deutschland' },
    imprintTeamHeading: { en: 'Who made KlarText', de: 'Wer KlarText gemacht hat' },
    imprintTeam: {
        en: 'KlarText was built by the team members listed below.',
        de: 'KlarText wurde von den unten genannten Teammitgliedern gebaut.',
    },
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
