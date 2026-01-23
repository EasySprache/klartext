# Docker Epics

This document outlines the epics and tickets required to containerize the application for easy deployment.

---

## Epic 1: Containerized Deployment
**Goal:** Enable the entire application (Frontend + Backend) to run with a single command (`docker compose up`) and be ready for cloud deployment.

### Ticket 1.1: Create Frontend Dockerfile for Development
**Context:** The backend already has a `Dockerfile`. We need one for the frontend that supports hot-reloading (Vite).
**Step 1: Create File**
Create `accessible-word-craft-main/Dockerfile.dev` with the following content:

```dockerfile
# Development Dockerfile for React/Vite
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy source
COPY . .

# Expose Vite port
EXPOSE 5173

# Run dev server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Ticket 1.2: Backend & Orchestration Setup
**Context:** Connect Frontend and Backend using Docker Compose.
**Step 1: Backend Dockerfile Check**
- Confirm `services/api/Dockerfile` exists.

**Step 2: Update `docker-compose.yml`**
Replace the content of `docker-compose.yml` (root directory) with:

```yaml
version: '3.8'

services:
  api:
    build: ./services/api
    ports:
      - "8000:8000"
    env_file:
      - ./services/api/.env
    volumes:
      - ./services/api:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      - ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

  web:
    build:
      context: ./accessible-word-craft-main
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./accessible-word-craft-main:/app
      - /app/node_modules
    depends_on:
      - api
    environment:
      - VITE_API_URL=http://api:8000
```

### Ticket 1.3: Runbook & Verification
**Context:** Validate that the system runs with one command.

**Detailed Verification Steps (Follow Exactly):**

1. **Prerequisite:** Open "Docker Desktop" from your Applications folder. Wait until the status bar icon stops animating and stays steady (or says "Docker Engine is running").
2. **Open Terminal:** Open a fresh Terminal window.
3. **Navigate:**
   ```bash
   cd /Users/alastair/Github/klartext
   ```
4. **Run Command:**
   ```bash
   docker compose up --build
   ```
5. **Wait:** Watch the logs. Wait approximately 30-60 seconds until you see lines similar to:
   - `api-1 | Uvicorn running on http://0.0.0.0:8000`
   - `web-1 | ... Ready in 200ms`
6. **Verify Frontend:**
   - Open Chrome/Safari.
   - Go to: `http://localhost:5173`
   - **Check:** Does the page load?
7. **Verify Backend:**
   - Go to: `http://localhost:8000/docs`
   - **Check:** Do you see the "fastapi" documentation page?
8. **End-to-End Test:**
   - In the Frontend (localhost:5173), type "test" in the box.
   - Click "Make it Easier".
   - **Check:** Does "Simplified Text" appear?
9. **Stop:**
   - Go back to the Terminal.
   - Press `Ctrl+C`.
   - Wait for "Gracefully stopping..."
   - Run `docker compose down` to clean up.

---

## Runbook for Deployment

### A. Quick Start (Prerequisites)
1. **Docker Desktop:** Must be installed and **running** (Green icon).
2. **Files:** Ensure you are in the project root: `/Users/alastair/Github/klartext`.

### B. Start Command
```bash
docker compose up --build
```
*(Leave this terminal window open. Do not close it.)*

### C. Validation
- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
