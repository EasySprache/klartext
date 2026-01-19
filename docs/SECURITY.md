# KlarText Security

This document describes the security architecture for the KlarText application, including authentication, authorization, and best practices for maintaining security.

## Overview

KlarText uses a two-layer authentication system:

1. **Password Gate** - Shared password to access the frontend
2. **API Key** - Server-generated key for API requests (obtained after password auth)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User → [Password] → Frontend → [API Key] → Backend API        │
│                                                                  │
│   1. User enters APP_PASSWORD                                    │
│   2. Backend validates, returns API_KEY                          │
│   3. Frontend stores API_KEY in sessionStorage                   │
│   4. All subsequent API calls include X-API-Key header           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Security (`services/api`)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | LLM provider API key |
| `APP_PASSWORD` | Production | Password for frontend access gate |
| `API_KEY` | Production | Key for authenticating API requests |
| `ALLOWED_ORIGINS` | Production | Comma-separated list of allowed CORS origins |
| `ENVIRONMENT` | No | `development` or `production` (default: `development`) |

### Authentication Middleware

The `APIKeyMiddleware` enforces authentication in production:

- **Requires `X-API-Key` header** on all requests except:
  - `/healthz` - Health check (for Fly.io monitoring)
  - `/v1/auth/verify` - Authentication endpoint (rate limited)
  - `OPTIONS` requests - CORS preflight

- **Development mode** (`ENVIRONMENT=development`):
  - All requests allowed without API key
  - API docs accessible at `/docs`

- **Production mode** (`ENVIRONMENT=production`):
  - API key required for all protected endpoints
  - API docs hidden (return 404)

### Rate Limiting

The `/v1/auth/verify` endpoint is rate limited to prevent brute force attacks:

- **Limit:** 5 requests per 60 seconds per IP address
- **Response:** HTTP 429 with `Retry-After` header
- **Implementation:** In-memory (resets on server restart)

**Note:** For multi-instance deployments, consider Redis-backed rate limiting.

### CORS Configuration

- **Development:** Allows all origins (`*`)
- **Production:** Restricted to origins in `ALLOWED_ORIGINS`

### Input Validation

All endpoints use Pydantic models with:
- Maximum text lengths (40,000 chars for simplify, 5,000 for TTS)
- Pattern validation for language codes and levels
- File size limits (10MB for PDFs)

## Frontend Security (`accessible-word-craft-main`)

### Session Management

- **Password validation:** Checked against backend, not stored locally
- **Session flag:** `klartext_authenticated` in sessionStorage
- **API key:** Stored in sessionStorage as `klartext_api_key`

Both are cleared when the browser tab/window is closed.

### API Communication

- All API calls go through `src/lib/api.ts`
- API key automatically included via `getApiHeaders()`
- No sensitive data in localStorage (only sessionStorage)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g., `https://klartext-api.fly.dev`) |

**Note:** `VITE_` prefixed variables are embedded in the JS bundle at build time.

## Chrome Extension

The Chrome extension (`apps/extension`) bypasses the password gate and API key mechanism. It:
- Communicates directly with the API
- Does not use the frontend authentication flow
- Should only be distributed to trusted users

## Security Considerations

### What's Protected

✅ API endpoints require valid API key in production
✅ Password attempts are rate limited (5/minute per IP)
✅ API documentation hidden in production
✅ CORS restricts browser-based cross-origin requests
✅ No raw user text logged (only hashes in analytics)

### Known Limitations

⚠️ **Shared password model** - All users share the same `APP_PASSWORD`. If compromised, change it and redeploy.

⚠️ **API key in browser** - After authentication, the API key is visible in browser dev tools. This is inherent to SPA architecture.

⚠️ **In-memory rate limiting** - Resets on server restart. For persistent rate limiting, implement Redis backend.

⚠️ **Direct API access** - Users who obtain the API key can call the API directly (not just through the frontend). This is expected.

### If Credentials Are Compromised

1. **APP_PASSWORD compromised:**
   ```bash
   fly secrets set APP_PASSWORD=new_secure_password
   ```
   Users will need to re-authenticate with the new password.

2. **API_KEY compromised:**
   ```bash
   fly secrets set API_KEY=$(openssl rand -hex 32)
   ```
   All authenticated sessions will be invalidated. Users must re-authenticate to get the new key.

3. **GROQ_API_KEY compromised:**
   - Rotate key in [Groq Console](https://console.groq.com/keys)
   - Update secret: `fly secrets set GROQ_API_KEY=new_key`

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| API key required | No | Yes |
| Rate limiting | No | Yes |
| API docs | Accessible | Hidden (404) |
| CORS | Allow all | Restricted |
| Password gate | Optional | Required |

## Security Checklist for Deployment

- [ ] Set `ENVIRONMENT=production` on Fly.io
- [ ] Set strong `APP_PASSWORD` (20+ chars recommended)
- [ ] Generate random `API_KEY`: `openssl rand -hex 32`
- [ ] Configure `ALLOWED_ORIGINS` with your Vercel domain
- [ ] Verify API docs return 404 in production
- [ ] Test rate limiting on auth endpoint
- [ ] Ensure HTTPS is enforced (Fly.io does this automatically)

## Reporting Security Issues

For security concerns, contact the KlarText team directly rather than opening a public issue.
