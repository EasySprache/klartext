# Documentation: AI Ethics & Warnings Implementation

This document describes the technical and UX decisions made regarding AI ethics and data transparency in the Klartext MVP.

## Approach: Radical Transparency

Our approach avoids hidden disclaimers. Instead, we place warnings directly at the points where users make decisions or receive information.

### 1. Data Privacy (Input Stage)
Before users provide text, we disclose that inputs are stored for development purposes.

*   **Placement**: Immediately above the input method selection in the "Enter the text you don’t understand" section.
*   **Copy Decision**: Used simple, direct language to ensure clarity for users with reading difficulties.
    *   *English*: "We save your text to make our tool better. Do not write private things like your name, address, or personal documents."
    *   *Joke*: Added a self-referential note to maintain a supportive tone: "(If you do not know what this means, you can paste it into the tool to make it easier to understand!)"
*   **Visual**: Soft blue background, info icon, inline with the card content.

### 2. AI Limitations (Output Stage)
Immediately above the simplified output, we clarify the nature of the result.

*   **Placement**: Top of the result card, before the simplified text.
*   **Copy Decision**: Explicitly warned against using the tool for high-stakes decisions (legal, health).
    *   *English*: "A computer made this text. It can make mistakes. Do not use it for important things like legal papers or health questions."
*   **Visual**: Soft amber background, caution icon, inline with the card content.

### 3. Automation Transparency (Human-in-the-Loop)
We explicitly state that **no human review** takes place. 
*   **Fact**: The process is 100% automated. 
*   **Risk**: Mistakes in the output are not caught by a person before the user sees them. We communicate this by saying "A computer made this text."

### 4. Provider Transparency (Data Supply Chain)
We use third-party AI models to process the text.
*   **Fact**: When you click "Simplify," the text is sent to our servers and then to **Groq** (using **Meta's Llama model**) for processing. 
*   **Privacy**: This is why we warn users not to include private information, as it travels outside our immediate application environment.

## Technical Implementation

### The `InfoWarning` Component
*   **Inline Design**: Built as a compact functional component to avoid the intrusiveness of popups or modals.
*   **Variants**: Supports `info` (blue) and `caution` (amber) states with corresponding icons.
*   **Accessibility**: 
    *   Uses `role="alert"` for screen readers.
    *   Scalable typography (Atkinson Hyperlegible) that respects user font-size settings.
*   **Localization**: Keys integrated into `LanguageContext.tsx` for seamless switching between English and German.

## Decisions for Cognitive Accessibility

*   **Simple Vocabulary**: Avoided terms like "PII", "LLM", or "data processing".
*   **Short Sentences**: Kept under 15 words to prevent cognitive overload.
*   **Non-Alarmist Design**: Used pale background colors instead of "error red" to keep the UI calm and supportive.
*   **Always Visible**: Removed accordion/collapsible logic to ensure important warnings are never hidden by mistake.

## Known Gaps & Future Improvements

1.  **Feedback Loop**: Currently, users cannot "Report a Mistake" or flag bad simplifications in the UI. This is a priority for the next version to help us catch systematic AI biases.
2.  **Retention Clarity**: We state that we "save text," but we should eventually add a clear data deletion button or a "forget me" feature for added user control.
