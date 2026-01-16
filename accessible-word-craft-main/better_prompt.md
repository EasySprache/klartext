# Prompt: Create "Focus Mode" Experimental UI (Cognitive Accessibility Version)

**Role**
You are a Senior Frontend Engineer & Accessibility Specialist.

**The User / The "Why"**
You are designing for users with cognitive disabilities.
-   **They do not know "how to use a website".**
-   **They get anxious if they don't know where they are.**
-   **They need reassurance at every single step.**
-   **They must NEVER feel "trapped" or "lost" in a new page.**

**The Task**
Create a specialized experimental UI variant in a new subdirectory: `accessible-word-craft-main/ui-v2-test`.
This UI must solve the "Information Overload" of the current dashboard by turning it into a **Single-Page Progressive Flow**.

**Core UX Principles (Non-Negotiable)**
1.  **Single Page, No Routing**: The user must NEVER leave the page. "Going back" is just "Scrolling up".
2.  **Progressive Disclosure**: Show only what is needed *right now*. Do not show the "Simplify" button until text is entered. Do not show the "Result" until simplification is done.
3.  **Explicit Hand-Holding**: Do not just show a dropdown. Ask a question: *"What language do you want to read?"*
4.  **Preserve Character & Utils**: You must use the existing design system (soft colors, rounded corners) and existing utils (PDF Upload, Accessibility Panel).

**Implementation Strategy: "Clone & Guided Reveal"**
1.  **Setup**: Initialize a new Vite + React + TypeScript app in `ui-v2-test`.
2.  **Clone Assets**: Copy `tailwind.config.ts`, `src/index.css`, `src/components/ui/`, `src/lib/`, `src/contexts/`, and `src/components/AccessibilityPanel.tsx` to the new directory. **Ensure the new app looks 100% identical to the main app in terms of fonts and colors.**
3.  **Build the Flow**:
    -   Create a single long scrolling page (`App.tsx`).
    -   **Section 1: The Setup**. Ask: "Which language?". Large, friendly buttons.
    -   **Section 2: The Input**. Reveal this ONLY after Language is picked. Ask: "Do you have a file or do you want to type?".
        -   *Must support existing PDF Upload logic.*
        -   *Must support existing Textarea logic.*
    -   **Section 3: The Action**. Reveal this ONLY when input is detected. A large, reassuring "Make it Easier" button.
    -   **Section 4: The Result**. Reveal this BELOW the input.
        -   Do not hide the input! The user must be able to scroll up to see what they wrote.
        -   Show the result in a calm, readable way.
        -   Include the standard actions: Copy, Read Aloud.

**Output**
A functional, accessible prototype in `ui-v2-test` that feels like a friendly conversation, not a software tool.
