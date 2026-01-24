import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityState {
    fontSize: number;
    increasedSpacing: boolean;
    increasedWordSpacing: boolean;
    dyslexiaFont: boolean;
    highContrast: boolean;
}

interface AccessibilityContextType extends AccessibilityState {
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    toggleSpacing: () => void;
    toggleWordSpacing: () => void;
    toggleDyslexiaFont: () => void;
    toggleHighContrast: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AccessibilityState>({
        fontSize: 18,
        increasedSpacing: false,
        increasedWordSpacing: false,
        dyslexiaFont: false,
        highContrast: false,
    });

    useEffect(() => {
        document.documentElement.style.fontSize = `${state.fontSize}px`;
    }, [state.fontSize]);

    useEffect(() => {
        document.body.classList.toggle('increased-spacing', state.increasedSpacing);
    }, [state.increasedSpacing]);

    useEffect(() => {
        document.body.classList.toggle('increased-word-spacing', state.increasedWordSpacing);
    }, [state.increasedWordSpacing]);

    useEffect(() => {
        document.body.classList.toggle('dyslexia-font', state.dyslexiaFont);
    }, [state.dyslexiaFont]);

    useEffect(() => {
        document.body.classList.toggle('high-contrast', state.highContrast);
    }, [state.highContrast]);

    const increaseFontSize = () => setState(s => ({ ...s, fontSize: Math.min(s.fontSize + 2, 28) }));
    const decreaseFontSize = () => setState(s => ({ ...s, fontSize: Math.max(s.fontSize - 2, 14) }));
    const toggleSpacing = () => setState(s => ({ ...s, increasedSpacing: !s.increasedSpacing }));
    const toggleWordSpacing = () => setState(s => ({ ...s, increasedWordSpacing: !s.increasedWordSpacing }));
    const toggleDyslexiaFont = () => setState(s => ({ ...s, dyslexiaFont: !s.dyslexiaFont }));
    const toggleHighContrast = () => setState(s => ({ ...s, highContrast: !s.highContrast }));

    return (
        <AccessibilityContext.Provider value={{
            ...state,
            increaseFontSize,
            decreaseFontSize,
            toggleSpacing,
            toggleWordSpacing,
            toggleDyslexiaFont,
            toggleHighContrast,
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
    return context;
}
