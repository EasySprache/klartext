# Sprint Plan: Deployment & PDF Features

**Goal:** Professionalize the MVP by containerizing the application for easy deployment (Docker) and restoring the PDF import functionality in the Frontend.

**Why Docker?** Think of Docker as a "shipping container" for your code.
1. Consistency: Currently, you have to install specific versions of Python and Node on your Mac. If we move to a server (or another developer's Windows machine), we have to do it all again manually, and it breaks often. Docker packages everything (the OS, Python, Node, your code) into a single standard block.
2. Simplicity to Run: Instead of opening 2 terminals and running source venv/bin/activate and npm run dev, you literally just run one command: docker compose up. It starts the database, backend, and frontend all together, connected perfectly.
3. Deployment: When we deploy to the cloud (AWS, Azure, etc.), we just send them this "container". We don't have to SSH in and install Python manually.

## Epic 1: Containerized Deployment (Docker)
**Objective:** Enable the entire application (Frontend + Backend) to run with a single command (`docker compose up`) and be ready for cloud deployment.

### Ticket 1.1: Containerize Backend API
**Task:** Create a `Dockerfile` for the FastAPI service.
**File:** `services/api/Dockerfile`
**Instructions:** Create the file with the exact content below:

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Ticket 1.2: Containerize Frontend Application
**Task:** Create a `Dockerfile` for the React/Vite application.
**File:** `accessible-word-craft-main/Dockerfile`
**Instructions:** Create the file with the exact content below:

```dockerfile
# Stage 1: Build the React Application
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Ticket 1.3: Orchestrate with Docker Compose
**Task:** Create `docker-compose.prod.yml` to run both containers together.
**File:** `docker-compose.prod.yml` (in the root directory of the repo)
**Instructions:** Create the file with the exact content below:

```yaml
version: '3.8'

services:
  # Backend Service
  api:
    build: ./services/api
    ports:
      - "8000:8000"
    env_file:
      - ./services/api/.env
    volumes:
      - ./services/api:/app
    environment:
      - ALLOWED_ORIGINS=http://localhost:8080

  # Frontend Service
  web:
    build: ./accessible-word-craft-main
    ports:
      - "8080:80"
    depends_on:
      - api
```

---

## Epic 2: PDF Import Feature
**Objective:** Allow users to upload PDF files directly in the UI, extracting text for simplification.

### Ticket 2.1: Create Test Assets
**Task:** Create a reliable test PDF.
**File:** `tests/fixtures/sample_simple.pdf`
**Instructions:**
1. Open a text editor (or Word).
2. Write: "This is a test PDF. It has simple text."
3. Save/Export as PDF to `tests/fixtures/sample_simple.pdf`.
4. (Create the folder `tests/fixtures` if it doesn't exist).

### Ticket 2.2: Implement PDF Upload UI
**Task:** Add a file input to the Translation interface.
**File:** `accessible-word-craft-main/src/components/TranslationSection.tsx`
**Instructions:** Update the component to include this upload logic.

**Code Snippet (Add inside the component):**

```typescript
// Add this state
const [isUploading, setIsUploading] = useState(false);

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 1. Validation
  if (file.type !== 'application/pdf') {
    toast({ title: "Error", description: "Only PDF files are supported.", variant: "destructive" });
    return;
  }
  if (file.size > 10 * 1024 * 1024) { // 10MB
    toast({ title: "Error", description: "File is too large (max 10MB).", variant: "destructive" });
    return;
  }

  setIsUploading(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
    // 2. Upload
    const response = await fetch('http://localhost:8000/v1/ingest/pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();
    
    // 3. Update Input Text with Result
    setInputText(data.extracted_text);
    toast({ title: "Success", description: "PDF text extracted successfully!" });
    
  } catch (error) {
    console.error(error);
    toast({ title: "Error", description: "Failed to extract text from PDF.", variant: "destructive" });
  } finally {
    setIsUploading(false);
  }
};
```

**UI Snippet (Add in your JSX where you want the button):**

```tsx
<div className="mb-4">
  <input
    type="file"
    accept=".pdf"
    id="pdf-upload"
    className="hidden"
    onChange={handleFileUpload}
  />
  <label htmlFor="pdf-upload">
    <Button 
      variant="outline" 
      disabled={isUploading}
      asChild
    >
      <span>
        {isUploading ? "Uploading..." : "📄 Upload PDF"}
      </span>
    </Button>
  </label>
</div>
```

---

## Epic 3: Verification & Runbook
**Objective:** Update documentation so anyone can run the new Docker setup.

### Ticket 3.1: Update Runbook
**Task:** Add a "Docker Start" section to `LOCAL_RUNBOOK.md`.
**Instructions:** Paste this at the top of the "Quick Start" section.

```markdown
## 🐳 Docker Quick Start (Recommended)

Run the entire application (Frontend + Backend) with one command.

1. Ensure Docker is running.
2. Run:
   ```bash
   docker compose -f docker-compose.prod.yml up --build
   ```
3. Open http://localhost:8080.
```
