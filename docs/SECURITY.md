# KlarText Security

This document describes the security posture for KlarText.

## Overview

The deployed system relies on:

1. CORS restrictions for browser-based access control
2. Per-IP rate limiting in production
3. Secret management for upstream providers such as Groq and OpenAI

```
┌─────────────────────────────────────────────────────────────────┐
│                       Current Request Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User → Frontend → Backend API                                 │
│                                                                 │
│   1. Browser sends request from an allowed origin               │
│   2. Backend enforces CORS policy                               │
│   3. Production traffic is rate limited per IP                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Security (`services/api`)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | LLM provider API key |
| `ALLOWED_ORIGINS` | Production | Comma-separated list of allowed CORS origins |
| `ENVIRONMENT` | No | `development` or `production` (default: `development`) |
| `TRUSTED_PROXY_IPS` | No | Optional comma-separated public proxy IPs trusted for forwarded client IP headers |

### Request Controls

The `RateLimitMiddleware` applies lightweight abuse protection in production:

- Skips `/healthz` for monitoring
- Skips `OPTIONS` requests for CORS preflight
- Is disabled entirely in development mode

### Rate Limiting

Production requests are rate limited to reduce burst abuse:

- Limit: 30 requests per 60 seconds per IP address
- Response: HTTP 429 with `Retry-After` header
- Implementation: In-memory (resets on server restart)

For multi-instance deployments, consider Redis-backed rate limiting.

### CORS Configuration

- Development: Allows all origins (`*`)
- Production: Restricted to origins in `ALLOWED_ORIGINS`

### Input Validation

All endpoints use Pydantic models with:

- Maximum text lengths (40,000 chars for simplify, 5,000 for TTS)
- Pattern validation for language codes and levels
- File size limits (10MB for PDFs)

## Frontend Security (`apps/web-mvp`)

### API Communication

- All API calls go through `src/lib/api.ts`
- No auth token or API key is injected by the frontend helper
- No browser session storage is used for app access control

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g. `https://klartext-api.fly.dev`) |

`VITE_`-prefixed variables are embedded in the JS bundle at build time.

## Chrome Extension

The Chrome extension (`apps/extension`) communicates directly with the API using the same request model as the web frontend.

## Security Considerations

### What Is Still Protected

- Production traffic is rate limited
- CORS restricts browser-based cross-origin requests
- No raw user text is logged in analytics; only hashes are stored

### Known Limitations

- Anyone who can reach the API can call it; CORS only constrains browser-based access
- In-memory rate limiting resets on server restart
- CORS only constrains browsers; non-browser clients can still call the API directly

### If Secrets Are Compromised

1. `GROQ_API_KEY` compromised:
   - Rotate the key in the Groq Console
   - Update the secret: `fly secrets set GROQ_API_KEY=new_key`

2. `OPENAI_API_KEY` compromised:
   - Rotate the key in the OpenAI dashboard
   - Update the secret: `fly secrets set OPENAI_API_KEY=new_key`

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Rate limiting | No | Yes |
| API docs | Accessible | Accessible |
| CORS | Allow all | Restricted |

## Security Checklist for Deployment

- [ ] Set `ENVIRONMENT=production` on Fly.io
- [ ] Configure `ALLOWED_ORIGINS` with your Vercel domain
- [ ] Test rate limiting against an API endpoint
- [ ] Ensure HTTPS is enforced

## Reporting Security Issues

For security concerns, contact the KlarText team directly rather than opening a public issue.
