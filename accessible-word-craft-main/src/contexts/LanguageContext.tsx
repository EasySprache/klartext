import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'de';

interface Translations {
  [key: string]: {
    en: string;
    de: string;
  };
}

const translations: Translations = {
  // Header
  skipToContent: { en: 'Skip to Content', de: 'Zum Inhalt springen' },
  home: { en: 'Home', de: 'Startseite' },
  howItWorks: { en: 'How It Works', de: 'So funktioniert es' },
  accessibility: { en: 'Accessibility', de: 'Barrierefreiheit' },
  contact: { en: 'Contact', de: 'Kontakt' },
  accessibilitySettings: { en: 'Accessibility Settings', de: 'Barrierefreiheit-Einstellungen' },
  
  // Hero
  heroTitle: { en: 'Turn Difficult Text Into Easy Language', de: 'Schwierige Texte in einfache Sprache verwandeln' },
  heroSubtitle: { en: 'Clear words. Short sentences. Easy to read.', de: 'Klare Wörter. Kurze Sätze. Leicht zu lesen.' },
  startNow: { en: 'Start Now', de: 'Jetzt starten' },
  
  // Translation Section
  translateYourText: { en: 'Translate Your Text', de: 'Übersetze deinen Text' },
  originalText: { en: 'Original Text', de: 'Originaltext' },
  pasteTextHere: { en: 'Paste or type your text here. We will make it easier to read.', de: 'Füge deinen Text hier ein oder tippe ihn. Wir machen ihn leichter lesbar.' },
  easyLanguageVersion: { en: 'Easy Language Version', de: 'Einfache Sprache Version' },
  resultHere: { en: 'Your easy-to-read text will appear here.', de: 'Dein leicht lesbarer Text erscheint hier.' },
  chooseLevel: { en: 'Choose how easy you want the text:', de: 'Wähle, wie einfach der Text sein soll:' },
  veryEasy: { en: 'Very Easy', de: 'Sehr einfach' },
  veryEasyDesc: { en: 'Short words. Very short sentences.', de: 'Kurze Wörter. Sehr kurze Sätze.' },
  easy: { en: 'Easy', de: 'Einfach' },
  easyDesc: { en: 'Simple words. Clear sentences.', de: 'Einfache Wörter. Klare Sätze.' },
  medium: { en: 'Medium', de: 'Mittel' },
  mediumDesc: { en: 'Everyday language. Normal sentences.', de: 'Alltagssprache. Normale Sätze.' },
  makeItEasier: { en: 'Make It Easier', de: 'Einfacher machen' },
  processing: { en: 'Processing...', de: 'Wird verarbeitet...' },
  copyText: { en: 'Copy text', de: 'Text kopieren' },
  readAloud: { en: 'Read aloud', de: 'Vorlesen' },
  textCopied: { en: 'Text copied!', de: 'Text kopiert!' },
  
  // How It Works
  howItWorksTitle: { en: 'How It Works', de: 'So funktioniert es' },
  step1Title: { en: 'Paste your text', de: 'Text einfügen' },
  step1Desc: { en: 'Copy any text and paste it in the box.', de: 'Kopiere einen Text und füge ihn in das Feld ein.' },
  step2Title: { en: 'Press the button', de: 'Knopf drücken' },
  step2Desc: { en: 'Click "Make It Easier" to translate.', de: 'Klicke auf "Einfacher machen" zum Übersetzen.' },
  step3Title: { en: 'Read or listen', de: 'Lesen oder hören' },
  step3Desc: { en: 'Read the easy text or listen to it.', de: 'Lies den einfachen Text oder höre ihn dir an.' },
  
  // Who This Helps
  whoThisHelps: { en: 'Who This Helps', de: 'Wem das hilft' },
  learningDisabilities: { en: 'People with learning disabilities', de: 'Menschen mit Lernschwierigkeiten' },
  slowReaders: { en: 'People who read slowly', de: 'Menschen, die langsam lesen' },
  seniors: { en: 'Seniors', de: 'Senioren' },
  languageLearners: { en: 'Language learners', de: 'Sprachlernende' },
  clearTextUsers: { en: 'Anyone who wants clear text', de: 'Alle, die klaren Text möchten' },
  
  // Footer
  footerMission: { en: 'We help people understand information.', de: 'Wir helfen Menschen, Informationen zu verstehen.' },
  accessibilityStatement: { en: 'Accessibility Statement', de: 'Erklärung zur Barrierefreiheit' },
  privacy: { en: 'Privacy', de: 'Datenschutz' },
  
  // Accessibility Panel
  textSize: { en: 'Text Size', de: 'Textgröße' },
  smaller: { en: 'Smaller', de: 'Kleiner' },
  larger: { en: 'Larger', de: 'Größer' },
  moreSpace: { en: 'More Space Between Lines', de: 'Mehr Zeilenabstand' },
  dyslexiaFont: { en: 'Dyslexia-Friendly Font', de: 'Legasthenie-freundliche Schrift' },
  highContrast: { en: 'High Contrast', de: 'Hoher Kontrast' },
  close: { en: 'Close', de: 'Schließen' },
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
