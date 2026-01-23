# UX/UI Design Journey & Decisions

**Date:** January 23, 2026  
**Status:** Final MVP Documentation  
**Target Audience:** Project Stakeholders & Technical Team

---

## 1. Executive Summary

Klartext is a specialized tool designed to assist adults with disabilities in understanding difficult texts and documents. The core challenge is to provide complex text processing capabilities (simplification, text-to-speech) without overwhelming users who may struggle with cognitive load, language processing, or digital interfaces.

This document outlines the evolution of our interface design, the specific user needs that drove our decisions, and the technical implementation of our final MVP.

---

## 2. User Context & Design Principles

Our target users are adults who need support involved with reading complex documents (letters, forms, contracts). This specific context defined our core design principles:

### Key User Needs
*   **Adult Tone**: Users are adults, often dealing with serious life administration. The UI must be clear and simple but **never infantilizing**. We avoid "childish" illustrations or gamification in favor of a clean, respectful utility aesthetic.
*   **Cognitive Support**: Users reported feeling "lost" in traditional multi-page websites. They need to know *where* they are in a process and *why* they are there.
*   **Explicit Guidance**: Abstract icons or single-word buttons (e.g., "Submit") are often ambiguous. Our users prefer explicit questions and descriptive actions (e.g., "I will paste text" or "Read this text aloud").
*   **Persistence**: Users find it disorienting when information disappears or when they are routed to a new page and cannot see their previous input.

### Core Design Principles
1.  **Single-Screen Flow**: Keep the user on one continuous page. Use scrolling to reveal progress rather than routing to new URLs.
2.  **Contextual Orientation**: Always show the user where they are (Chapter Navigation) and what the tool offers (Welcome/Mission Statement).
3.  **Low-Contrast Navigation**: Navigation aids should be supportive but secondary to the main task content.
4.  **Bilingual by Design**: The interface toggle (English/German) must be immediate and clear, using first-person language ("I speak English").

---

## 3. UI/UX Evolution (Version History)

We iterated through four distinct versions to arrive at our final solution.

### v0: Sprint 1 Proof of Concept (`demo/`)
*   **Goal**: Validate the core value proposition and API connectivity.
*   **Implementation**: `demo/app.py` (Gradio).
*   **Design**: A functional loop of Input -> Button -> Output.
*   **Learning**: Confirmed the backend technology (`pdf_utils.py`, Groq API) works, but the standard data-science UI (Gradio) is too technical and rigid for our end users.

### v1: Loveable side-by-side design (`accessible-word-craft-main/`)
*   **Goal**: Create a custom React frontend.
*   **Implementation**: `src/pages/Index.tsx` composing multiple heavy sections (`TranslationSection`, `HowItWorksSection`).
*   **Design**: A "Dashboard" or "Landing Page" approach where all options and information were visible simultaneously.
*   **Learnings**: UX testing showed high cognitive load. Users wouldn't know where to start or focus. The landing page felt like it was built for regular users, not our target users.

### v2: Guided Flow Experiment (`apps/deprecated/v2-experiment-guided/`)
*   **Goal**: Reduce cognitive load by showing only one thing at a time.
*   **Implementation**: `src/App.tsx` using strict state-based stepping (`const [currentStep, setCurrentStep] = useState(1)`).
    *   Used a "Section Reveal" pattern where future steps were hidden until the current step was complete.
*   **Design**: A strict linear wizard.
*   **Learnings**: While it solved the "overload" problem, it introduced "disorientation". Users felt trapped and unsure about what would happen next. They missed the context of "What is this tool?" before being asked to "Upload PDF".

### v3: Final MVP - Hybrid Flow (`apps/web-mvp/`)
*   **Goal**: Combine the **guidance** of v2 with the **orientation** of v1.
*   **Implementation**: `src/App.tsx` using `IntersectionObserver` to track scroll position and mapped to a `SidebarNav`.
*   **Design**: A single long-form page that *feels* like a guided process but allows the user to scroll up and down to check context. Orientation and purpose has been prioritised.
*   **Outcome**: Much better result for both understanding, experience using the tool, and task completion. Users understand the purpose, whilst the guided portion does not create any negative bottlenecks.

---

## 4. Final MVP User Journey & Implementation

Our final design in `apps/web-mvp/` implements specific features to address the user needs:

### 4.1 Orientation & Navigation
*   **Sidebar Navigation (`src/components/SidebarNav.tsx`)**:
    *   **Why**: standard breadcrumbs (1 > 2 > 3) are too abstract. We use "Chapter" titles that describe the *outcome* of that section (e.g., "What is Klartext?", "Enter text", "Read result").
    *   **Tech**: Uses `scrollToSection` to smoothly scroll between anchors (`#welcome`, `#input`, `#output`) without refreshing the page.
*   **Sticky Header**: Contains the "Klartext" brand and the Language Toggle, ensuring the user can always reset or switch languages.

### 4.2 The Welcome "Chapter" (`#welcome`)
*   **Goal**: Establish trust and explain the "Mental Model" of the app before asking for work.
*   **Implementation**: 
    *   Visual flow using Lucide icons (`FileText` -> `Wand2` -> `BookOpen`) connected by SVG curved arrows.
    *   CTA: "OK, let's start" clearly marks the transition from "Learning" to "Doing".
    *   **Avoids**: Generic "Welcome" headers. Uses specific "Klartext helps you understand..." copy.

### 4.3 The Input "Chapter" (`#input`)
*   **Dual Input Methods**:
    *   Instead of a complex file picker, we present two large, equal-weight cards: "I will paste text" vs "I have a PDF".
    *   **Tech**: Toggles `inputMethod` state (`paste` | `pdf`) but keeps the user in the same section.
    *   The "Simplify" button (`handleSimplify`) is **disabled** until input exists, preventing detailed error messages.
*   **PDF Integration**:
    *   Uses `src/App.tsx` `handleFileUpload` to POST to `/v1/ingest/pdf`.
    *   **Crucial Choice**: We extract the text and *immediately show it* in the text area. This gives the user control to verify/edit the text before simplification, rather than a "black box" upload.

### 4.4 The Output "Chapter" (`#output`)
*   **Animation**: The result card enters with `animate-in fade-in slide-in-from-bottom-8`. This gentle movement draws the eye without being startling.
*   **Post-Actions**:
    *   **Read Aloud**: Uses `handleSpeak` which attempts the backend TTS API first, falling back to the browser's `speechSynthesis` if the API fails or times out. This ensures accessibility even if offline/disconnected.
    *   **Copy**: Simple utility for taking the text elsewhere.
*   **Reset**: A clear "Start Again" action at the bottom of the flow (`handleStartAgain`) resets the state and scrolls back to the input, creating a repeatable loop.

---

## 5. AI & Technical Considerations

Designing for an LLM-powered tool required specific UI accommodations:

1.  **Latency Management**:
    *   The simplification can take 2-10 seconds. We use a standard `Loader2` spinner with the text "Processing..." on the primary button.
    *   We do *not* lock the UI; the user can still scroll up to read their input, maintaining agency.

2.  **Variable Output Length**:
    *   LLM output length is unpredictable. We use a flexible height `Textarea` and auto-expanding Result Card to accommodate any length without scroll-trapping text.

3.  **Language Handling**:
    *   We separate **UI Language** (User's interface preference) from **Content Language** (The text being processed).
    *   The `LanguageToggle` controls the UI labels (via `useLanguage` context).
    *   The API payload explicitly sends `target_lang`, allowing a German user to potentially simplify English text if needed (though our MVP defaults to matching them).

---

## 6. Summary of Key Files

For the final presentation and code review, these are the critical files representing our best work:

*   **`apps/web-mvp/src/App.tsx`**: The core logic orchestrator.
*   **`apps/web-mvp/src/components/SidebarNav.tsx`**: The navigation component that provides the "Chapter" orientation.
*   **`apps/web-mvp/src/components/LanguageToggle.tsx`**: The accessible, bistable toggle switch.
*   **`services/api/`**: The backend supporting the PDF extraction and Simplification endpoints.
