# agent.md

This repo follows the conventions from agents.md: keep instructions short, explicit, and actionable.

## Mission
Build KlarText: an accessibility-first tool that simplifies German/English text (and PDFs) into easy language and optionally reads it aloud.

## What “done” means (MVP)
- Pasted text + PDF upload both work end-to-end.
- Difficulty levels change the output style in a noticeable way.
- Long inputs are handled via chunking.
- The UI is keyboard-usable and screen-reader friendly.
- API has OpenAPI docs at `/docs`.

## Repo map
- `apps/web-mvp` (React/Vite): production web UI
- `apps/demo` (Gradio): testing/staging environment
- `services/api` (FastAPI): ingestion + simplify + TTS
- `apps/extension` (optional): Chrome extension MV3
- `prompts`: prompt templates and test fixtures
- `docs`: screenshots, ADRs, diagrams

## Commands (local)
Recommended via Docker:
- `docker compose up --build` – run everything
- `docker compose down` – stop
- `docker compose logs -f api` – API logs
- `docker compose logs -f web` – web logs

If running without Docker:
- Web: `cd apps/web-mvp && npm i && npm run dev`
- Demo: `cd apps/demo && python app.py`
- API: `cd services/api && pip install -r requirements.txt && uvicorn app.main:app --reload`

## Engineering principles
- Accessibility is a feature, not polish.
- Avoid hallucinations:
  - never invent facts
  - if input is unclear, say so
  - preserve meaning over “sounding nice”
- Keep the MVP small:
  - no accounts, no payments, no crawling
- Observability:
  - log request ids, timings, and chunk counts
  - never log raw user text in production (use hashing/redaction)

## Prompt rules (must)
- Short sentences.
- Common words.
- Explain technical terms if unavoidable.
- Do not add new facts.
- Add a short “not advice” note for legal/medical/financial content.

## API contract rules
- Keep request/response shapes stable once the UI depends on them.
- Version endpoints under `/v1`.
- Return structured errors:
  - `{ error: { code, message, details? } }`

## Testing expectations
- Backend: unit tests for chunking + prompt selection + language detection
- Frontend: at least smoke tests for the main flow
- Include test fixtures in `prompts/fixtures`

## Security / abuse controls (MVP-minimum)
- Basic per-IP rate limiting
- File upload limits (PDF size)
- Reject obviously non-PDF uploads
- Timeouts on external provider calls

## Pull request checklist
- [ ] API endpoints documented (OpenAPI)
- [ ] Accessible labels / focus states verified
- [ ] Error states handled (no blank screens)
- [ ] No secrets committed
- [ ] Tests updated or added
