# Project Overview & Architecture

## Sprint 2: Prototype to MVP

**Objective:** Transition from the Sprint 1 Gradio prototype to a production-ready Web Application architecture. This involves establishing a distinct Frontend (React) and Backend (FastAPI) and connecting them via REST API.

### Current Sprint Goals (Epics)

#### Epic 1: Establish MVP Architecture
The goal is to separate the application logic (Python) from the user interface (React) to allow for independent scaling and development.

**Sprint Tickets:**
*   **[ ] Verify Backend API**: Start the FastAPI service locally and confirm endpoints (`/v1/simplify`, `/healthz`) are reachable via Swagger UI.
*   **[ ] Verify Frontend Application**: Start the React application locally and confirm the UI renders correctly in the browser.
*   **[ ] Implement API Integration**: Replace the mock data in the Frontend with actual HTTP requests to the Backend API.
*   **[ ] End-to-End Validation**: Perform a full user flow (Input Text -> Simplify -> Output) to verify the integration.

---

## Component Architecture

### 1. Backend Service (`services/api`)
*   **Tech Stack**: Python, FastAPI, Uvicorn.
*   **Purpose**: Handles all business logic, LLM interaction (Groq), text processing, and TTS generation.
*   **Key Files**:
    *   `app/main.py`: Entry point and route definitions.
    *   `.env`: Configuration for API keys.
*   **Usage**: Must be running for the application to function. It exposes the REST API on port 8000.

### 2. Frontend Application (`accessible-word-craft-main`)
*   **Tech Stack**: React, Vite, TypeScript, Tailwind CSS.
*   **Purpose**: The user-facing interface. Handles user input, state management, and display of simplified text.
*   **Key Files**:
    *   `src/components/TranslationSection.tsx`: Contains the simplification logic and API call.
    *   `vite.config.ts`: Configuration for the dev server (port 8080).
*   **Usage**: The primary interface for end-users. Access via browser at `http://localhost:8080`.

### 3. Prototype (`demo/`)
*   **Tech Stack**: Python, Gradio.
*   **Purpose**: A self-contained sandbox for rapid testing of prompts and models.
*   **Usage**: Use this for internal testing of model performance ("prompt engineering") without needing to run the full React frontend. It interacts with the Backend logic but bypasses the React UI layer.

### 4. Legacy/Depreciated (`apps/web`)
*   **Status**: specific legacy code.
*   **Usage**: Do not use. Reference only.

---

## Workflow: How to Run the Project

For detailed step-by-step commands (installing dependencies, exact terminal commands), refer to **`accessible-word-craft-main/LOCAL_RUNBOOK.md`**.

**High-Level Workflow:**
1.  **Start the Backend**: This initializes the API server.
2.  **Start the Frontend**: This serves the UI.
3.  **Development Loop**:
    *   Modify React code in `accessible-word-craft-main` for UI changes.
    *   Modify Python code in `services/api` for logic/prompt changes.
    *   Verify changes by using the UI to trigger API calls.
