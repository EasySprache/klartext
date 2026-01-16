# Sprint 2/3 Frontend: PDF Import Integration

This document contains step-by-step instructions to add PDF upload functionality to the frontend.

**Goal:** Allow users to upload a PDF file. The app will send it to the backend, extract the text, and paste it into the "Original Text" box automatically.

---

## Part 1: Start Your Servers

Before writing code, let's make sure everything is running so you can see your changes instantly.

### Step 1: Start the Backend API
1.  Open your terminal application (e.g., Terminal, iTerm, VS Code terminal).
2.  Navigate to the API folder by running this command:
    ```bash
    cd /Users/alastair/Github/klartext/services/api
    ```
3.  Activate the virtual environment:
    ```bash
    source .venv/bin/activate
    ```
    *(If that doesn't work, try `source venv/bin/activate`)*
4.  Start the API server:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
5.  **Keep this terminal window open.** You should see "Application startup complete".

### Step 2: Start the Frontend App
1.  Open a **new** terminal window (Cmd+N or "Split Terminal" in VS Code).
2.  Navigate to the frontend folder:
    ```bash
    cd /Users/alastair/Github/klartext/accessible-word-craft-main
    ```
3.  Start the frontend:
    ```bash
    npm run dev
    ```
4.  **Keep this terminal window open.** It will tell you the local URL (usually `http://localhost:5173`).
5.  Open your browser and search for `http://localhost:5173`. You should see the "KlarText" app.

---

## Part 2: Add the PDF Upload Feature

We will modify **one** file: `src/components/TranslationSection.tsx`.

### Step 1: Open the File
1.  In your code editor, find and open this file:
    `/Users/alastair/Github/klartext/accessible-word-craft-main/src/components/TranslationSection.tsx`

### Step 2: Add Necessary Imports
At the very top of the file, look for the `lucide-react` import. 
**Current code:**
```typescript
import { Sparkles, Loader2, Copy, Check, Volume2 } from 'lucide-react';
```

**Change it to (add `Upload` and `FileText`):**
```typescript
import { Sparkles, Loader2, Copy, Check, Volume2, Upload, FileText } from 'lucide-react';
```

### Step 3: Add State Variables
Inside the component function (around line 16), add a new state variable for uploading status.

**Find this line:**
```typescript
const [copied, setCopied] = useState(false);
```

**Add this line right after it:**
```typescript
const [isUploading, setIsUploading] = useState(false);
```

### Step 4: Add the File Upload Handler
We need a function that runs when a user selects a file. 

**Find the `handleTranslate` function.**
**Insert this new function BEFORE `const handleTranslate = ...`:**

```typescript
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Connect to the PDF Ingestion Endpoint
      const response = await fetch('http://localhost:8000/v1/ingest/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update the input text box with the extracted text from the PDF
      setInputText(data.extracted_text);
      
      toast({ 
        title: "PDF Uploaded", 
        description: `Extracted ${data.pages} pages successfully.` 
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Could not extract text from the PDF.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be selected again if needed
      e.target.value = '';
    }
  };
```

### Step 5: Add the Upload Button
Now we need to add the button to the UI. We will place it inside the first "Card" that holds the input text area.

**Find this code (around line 96):**
```typescript
<Card className="p-6">
  <Label htmlFor="input-text" className="text-lg font-medium mb-3 block">
    {t('originalText')}
  </Label>
```

**Replace that entire block (lines 96-99) with this new code:**
```typescript
<Card className="p-6">
  <div className="flex justify-between items-center mb-3">
    <Label htmlFor="input-text" className="text-lg font-medium">
      {t('originalText')}
    </Label>
    
    <div className="relative">
      <input
        type="file"
        id="pdf-upload"
        className="hidden"
        accept=".pdf"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById('pdf-upload')?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {isUploading ? "Extracting..." : "Upload PDF"}
      </Button>
    </div>
  </div>
```

---

## Part 3: Test It

1.  Go to your browser (`http://localhost:5173`).
2.  You should now see an **"Upload PDF"** button above the "Original Text" box.
3.  Click it and select a PDF document from your computer.
4.  **Watch:**
    - The button should say "Extracting..." briefly.
    - A success message should pop up ("PDF Uploaded").
    - The text from the PDF should automatically appear in the big text box.
5.  **Success!** Now you can click "Make it easier" to simplify that text.

