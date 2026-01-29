/**
 * KlarText Extension - UI Translations
 * Simple translation system for English and German
 */

const TRANSLATIONS = {
  en: {
    // Header
    tagline: 'Easy Language for Everyone',
    closePanel: 'Close panel',
    
    // Main description
    description: 'Transform complex text on this page into easy-to-understand language.',
    
    // Language detection
    pageLanguage: 'Page language:',
    languageEnglish: 'English',
    languageGerman: 'Deutsch',
    wrongClickChange: 'Wrong? Click to change',
    
    // Language selector options
    optionEnglish: 'English',
    optionGerman: 'Deutsch (German)',
    
    // Action buttons
    simplifySelection: 'Simplify selection',
    simplifyFullPage: 'Simplify full page',
    hintText: 'Highlight text on the page to simplify specific sections',
    
    // Progress and status
    restoreOriginalText: 'Restore original text',
    selectNewText: 'Select new text',
    cancelSimplification: 'Cancel simplification',
    
    // Webapp features
    moreFeaturesTitle: 'MORE FEATURES ON THE WEBAPP',
    featureInputTitle: 'Input Text',
    featureInputDesc: 'Paste or type text to simplify',
    featureUploadTitle: 'Upload PDF',
    featureUploadDesc: 'Simplify documents and files',
    featureTtsTitle: 'Text to Speech',
    featureTtsDesc: 'Listen to simplified content',
    poweredBy: 'Powered by Klartext',
    
    // Dynamic button states (used in JS)
    simplifying: 'Simplifying...',
    starting: 'Starting...',
    processing: 'Processing...',
    
    // Status messages (used in JS)
    waitForPage: 'Please wait for page simplification to complete',
    startingSimplification: 'Starting simplification...',
  },
  
  de: {
    // Header
    tagline: 'Einfache Sprache für Alle',
    closePanel: 'Panel schließen',
    
    // Main description
    description: 'Verwandeln Sie komplexe Texte auf dieser Seite in leicht verständliche Sprache.',
    
    // Language detection
    pageLanguage: 'Seitensprache:',
    languageEnglish: 'English',
    languageGerman: 'Deutsch',
    wrongClickChange: 'Falsch? Zum Ändern klicken',
    
    // Language selector options
    optionEnglish: 'English',
    optionGerman: 'Deutsch (German)',
    
    // Action buttons
    simplifySelection: 'Auswahl vereinfachen',
    simplifyFullPage: 'Ganze Seite vereinfachen',
    hintText: 'Markieren Sie Text auf der Seite, um bestimmte Abschnitte zu vereinfachen',
    
    // Progress and status
    restoreOriginalText: 'Originaltext wiederherstellen',
    selectNewText: 'Neuen Text auswählen',
    cancelSimplification: 'Vereinfachung abbrechen',
    
    // Webapp features
    moreFeaturesTitle: 'WEITERE FUNKTIONEN IN DER WEB-APP',
    featureInputTitle: 'Text eingeben',
    featureInputDesc: 'Text einfügen oder eingeben zum Vereinfachen',
    featureUploadTitle: 'PDF hochladen',
    featureUploadDesc: 'Dokumente und Dateien vereinfachen',
    featureTtsTitle: 'Text zu Sprache',
    featureTtsDesc: 'Vereinfachten Inhalt anhören',
    poweredBy: 'Bereitgestellt von Klartext',
    
    // Dynamic button states (used in JS)
    simplifying: 'Vereinfachung läuft...',
    starting: 'Wird gestartet...',
    processing: 'Wird verarbeitet...',
    
    // Status messages (used in JS)
    waitForPage: 'Bitte warten Sie, bis die Seitenvereinfachung abgeschlossen ist',
    startingSimplification: 'Vereinfachung wird gestartet...',
  }
};

/**
 * Get translation for a key in the specified language
 * @param {string} key - Translation key
 * @param {string} lang - Language code ('en' or 'de')
 * @returns {string} Translated text
 */
function t(key, lang = 'en') {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Update all UI elements with translations for the specified language
 * @param {string} lang - Language code ('en' or 'de')
 */
function updateUILanguage(lang) {
  const trans = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // Header
  const tagline = document.querySelector('.tagline');
  if (tagline) tagline.textContent = trans.tagline;
  
  const closeBtn = document.getElementById('close-panel');
  if (closeBtn) closeBtn.setAttribute('aria-label', trans.closePanel);
  
  // Main description
  const description = document.querySelector('.description');
  if (description) description.textContent = trans.description;
  
  // Language detection section
  const pageLanguageText = document.querySelector('.detected-language');
  if (pageLanguageText) {
    const detectedLangEl = document.getElementById('detected-lang');
    const currentLang = detectedLangEl?.textContent || 'English';
    pageLanguageText.innerHTML = `${trans.pageLanguage} <strong id="detected-lang">${currentLang}</strong>`;
  }
  
  const changeLangBtn = document.getElementById('change-lang');
  if (changeLangBtn) changeLangBtn.textContent = trans.wrongClickChange;
  
  // Language selector options
  const languageOverride = document.getElementById('language-override');
  if (languageOverride) {
    const options = languageOverride.querySelectorAll('option');
    if (options[0]) options[0].textContent = trans.optionEnglish;
    if (options[1]) options[1].textContent = trans.optionGerman;
  }
  
  // Action buttons
  const simplifySelectionBtn = document.querySelector('#simplify-selection .button-text');
  if (simplifySelectionBtn) simplifySelectionBtn.textContent = trans.simplifySelection;
  
  const simplifyPageBtn = document.querySelector('#simplify-page .button-text');
  if (simplifyPageBtn) simplifyPageBtn.textContent = trans.simplifyFullPage;
  
  const hintText = document.querySelector('.hint-text');
  if (hintText) hintText.textContent = trans.hintText;
  
  // Other buttons
  const restoreBtn = document.querySelector('#restore-button .button-text');
  if (restoreBtn) restoreBtn.textContent = trans.restoreOriginalText;
  
  const selectNewBtn = document.querySelector('#select-new-button .button-text');
  if (selectNewBtn) selectNewBtn.textContent = trans.selectNewText;
  
  const cancelBtn = document.getElementById('cancel-button');
  if (cancelBtn) cancelBtn.textContent = trans.cancelSimplification;
  
  // Webapp features section
  const sectionTitle = document.querySelector('.section-title');
  if (sectionTitle) sectionTitle.textContent = trans.moreFeaturesTitle;
  
  const featureTitles = document.querySelectorAll('.feature-title');
  const featureDescs = document.querySelectorAll('.feature-description');
  
  if (featureTitles[0]) featureTitles[0].textContent = trans.featureInputTitle;
  if (featureDescs[0]) featureDescs[0].textContent = trans.featureInputDesc;
  
  if (featureTitles[1]) featureTitles[1].textContent = trans.featureUploadTitle;
  if (featureDescs[1]) featureDescs[1].textContent = trans.featureUploadDesc;
  
  if (featureTitles[2]) featureTitles[2].textContent = trans.featureTtsTitle;
  if (featureDescs[2]) featureDescs[2].textContent = trans.featureTtsDesc;
  
  const poweredByLink = document.getElementById('powered-by-link');
  if (poweredByLink) poweredByLink.textContent = trans.poweredBy;
  
  // Update HTML lang attribute
  document.documentElement.lang = lang;
}

// Export for use in other scripts
window.KlarTextTranslations = {
  TRANSLATIONS,
  t,
  updateUILanguage
};
