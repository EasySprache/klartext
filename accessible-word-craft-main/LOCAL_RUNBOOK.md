# Local Runbook for KlarText

This guide will help you run the KlarText project locally, including the backend API and the new frontend.

## A. Quick Start (Fastest Path)

If you just want to get everything running:

**Terminal 1 (Backend):**
```bash
cd services/api
# Setup Python environment (required once)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd accessible-word-craft-main
# Install Dependencies (required once)
npm install

# Run
npm run dev
```

---

## B. Backend (FastAPI) Setup & Verify

The backend is located in `services/api/` and handles the text simplification logic.

### 1. Setup
**Prerequisites:** Python 3.11+.

1.  Navigate to the directory:
    ```bash
    cd services/api
    ```
2.  Create and activate a virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure Environment Variables:
    copy `env.example` to `.env`:
    ```bash
    cp env.example .env
    ```
    *Open `.env` and set your `GROQ_API_KEY`.*

### 2. Run
Start the development server:
```bash
uvicorn app.main:app --reload --port 8000
```
- `--reload`: Auto-restarts on code changes.
- `--port 8000`: Runs on port 8000.

### 3. Verify
open a **new** terminal window (leave the previous one running) and run:
- **Open Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Check Health:**
    ```bash
    curl http://localhost:8000/healthz
    # Expected output: {"ok":true}
    ```

### 4. Stop
To stop the server, press `Ctrl+C` in the terminal window where `uvicorn` is running.

---

## C. Frontend (React/Vite) Setup & Verify

The active frontend is in `accessible-word-craft-main/`.
*Note: The folder `apps/web` is legacy code and should be ignored.*

### 1. Setup
**Prerequisites:** Node.js (and `npm`).

1.  Navigate to the directory:
    ```bash
    cd accessible-word-craft-main
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### 2. Run
Start the local dev server:
```bash
npm run dev
```
You should see output indicating the server is running, typically on **port 8080**.

### 3. Verify
- Open your browser to the URL shown in the terminal (usually [http://localhost:8080](http://localhost:8080)).
- The UI should load (blue/clean "Accessible Word Craft" interface).
- *Note: At this stage, clicking "Make it easier" uses mock data and does not call the API yet.*

### 4. Stop
To stop the server, press `Ctrl+C` in the terminal window where `npm` is running.

---

## D. Connect Frontend → Backend

By default, the frontend uses mock data and the backend CORS settings block the frontend's port. Follow these two steps to connect them.

### Step 1: Fix CORS on Backend
The backend currently allows only port 3000. You must add port 8080.

1.  Open `services/api/app/main.py`.
2.  Find the `add_middleware` block (around line 100).
3.  Add `http://localhost:8080` to `allow_origins`.

**Change this:**
```python
allow_origins=["http://localhost:3000"],
```
**To this:**
```python
allow_origins=["http://localhost:3000", "http://localhost:8080"],
```
4.  Save the file. The backend (Terminal 1) should auto-reload.

### Step 2: Update Frontend Logic
Modify the frontend to call the real API instead of using mock data.

1.  Open `accessible-word-craft-main/src/components/TranslationSection.tsx`.
2.  Locate the `handleTranslate` function.
3.  Replace the entire function with the code below:

```typescript
  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast({ title: t('originalText'), description: t('pasteTextHere') });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/v1/simplify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          target_lang: language, // 'de' or 'en'
          level: 'easy' // currently hardcoded, or use {difficulty} state variable
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      setOutputText(data.simplified_text);
      toast({ title: '✓', description: t('resultHere') });

    } catch (error) {
      console.error("Translation failed:", error);
      toast({
        title: "Error",
        description: "Failed to connect to the API. Is it running?",
        variant: "destructive"
      });
      // Fallback for demo purposes if needed:
      // setOutputText("Error connecting to backend.");
    } finally {
        setIsLoading(false);
    }
  };
```

---

## E. End-to-End Test Checklist

Perform this loop to confirm everything is working:

1.  [ ] **Backend Running**: Terminal 1 shows `Uvicorn running on http://0.0.0.0:8000`.
2.  [ ] **Frontend Running**: Terminal 2 shows `Local: http://localhost:8080`.
3.  [ ] **Swagger Check**: Visit [http://localhost:8000/docs](http://localhost:8000/docs) and see the API page.
4.  [ ] **UI Load**: Visit [http://localhost:8080](http://localhost:8080).
5.  [ ] **Action**: Paste "The legislative body must ensure compliance with regulations." into the left box.
6.  [ ] **Click**: Click "Make it easier" / "Vereinfachen".
7.  [ ] **Success**:
    - Loader spins.
    - Right box fills with simplified text (e.g., "The government must make sure rules are followed.").
    - **No red error toast** appears.
    - **Backend terminal** shows a log line like `POST /v1/simplify 200 OK`.

---

## F. Troubleshooting

### 1. `ModuleNotFoundError` in Backend
- **Cause**: You didn't activate the virtual environment or install requirements.
- **Fix**: Run `source .venv/bin/activate` and `pip install -r requirements.txt`.

### 2. Frontend says "Failed to connect" or "Network Error"
- **Cause A**: Backend is not running. Check Terminal 1.
- **Cause B**: CORS error. Check your browser console (F12). If you see "CORS Missing Allow Origin", you skipped **Step D.1** (adding port 8080 to `main.py`).

### 3. Port already in use
- **Error**: `address already in use`.
- **Fix**: Stop other running processes.
    - Kill port 8000: `lsof -ti:8000 | xargs kill -9`
    - Kill port 8080: `lsof -ti:8080 | xargs kill -9`

### 4. Docker Compose fails
- **Note**: The `docker-compose.yml` in the root is set up for the **legacy** frontend (`apps/web`).
- **Advice**: Do not use `docker compose up` for the frontend. You can use it for the API (`docker compose up api`), but running locally with Python (as described in Section B) is often simpler for debugging.

---

## G. Missing Information
The following could not be determined from the repo:
1.  **Production URL**: No obvious configuration for where this is deployed in production.
2.  **Official Frontend Port**: Defaults to 8080 in Vite, but explicit configuration for deployment was not found.
3.  **Legacy Code Plan**: `apps/web` exists but is unused.
