# KlarText Deployment Guide

This guide covers deploying KlarText to production using **Vercel** (frontend) and **Fly.io** (backend).

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │         │     Fly.io      │
│   (Frontend)    │  HTTPS  │    (Backend)    │
│                 │────────►│                 │
│  Vite + React   │         │  FastAPI API    │
│  TypeScript     │         │  Python 3.11    │
└─────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │   Groq API    │
                            │   (LLM)       │
                            └───────────────┘
```

## Prerequisites

- GitHub account with repository access
- [Vercel account](https://vercel.com) (free tier works)
- [Fly.io account](https://fly.io) (free tier works)
- [Groq API key](https://console.groq.com/keys)

## Part 1: Deploy Backend to Fly.io

### 1.1 Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 1.2 Login to Fly.io

```bash
fly auth login
```

### 1.3 Deploy the API

```bash
cd services/api

# First-time setup (creates app, skips initial deploy)
fly launch --no-deploy

# Set required secrets
fly secrets set GROQ_API_KEY=your_groq_api_key_here

# Set CORS for your Vercel frontend URL
fly secrets set ALLOWED_ORIGINS=https://your-app.vercel.app

# Deploy
fly deploy
```

### 1.4 Verify Deployment

```bash
# Check status
fly status

# View logs
fly logs

# Test health endpoint
curl https://klartext-api.fly.dev/healthz
```

Your API should be running at `https://klartext-api.fly.dev` (or your custom app name).

### 1.5 Backend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for LLM calls |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins (your Vercel URL) |
| `ENVIRONMENT` | No | Set in fly.toml as `production` |
| `PORT` | No | Set in fly.toml as `8080` |

### 1.6 GitHub Actions (Optional)

The repo includes a GitHub Actions workflow to deploy the API automatically on push to `main`.

Workflow file: `.github/workflows/deploy-api.yml`

**Setup:**
1. Go to GitHub → **Settings → Secrets and variables → Actions**
2. Add a repository secret:
   - `FLY_API_TOKEN` = your Fly.io API token

You can create a token from your local machine:

```bash
fly auth token
```

Once set, pushes to `main` that modify `services/api/**` will trigger a deploy.

## Part 2: Deploy Frontend to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Important**: Set the root directory to `apps/web-mvp`

### 2.2 Configure Build Settings

Vercel should auto-detect Vite, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3 Set Environment Variables

In Vercel project settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://klartext-api.fly.dev` | Your Fly.io backend URL |

### 2.4 Deploy

Click "Deploy" and wait for the build to complete.

### 2.5 Update CORS on Backend

After getting your Vercel URL (e.g., `https://klartext-rho.vercel.app`), update the backend:

```bash
cd services/api
fly secrets set ALLOWED_ORIGINS=https://klartext-rho.vercel.app
```

## Part 3: Access Model

All endpoints are public. The backend relies on:

- `ALLOWED_ORIGINS` to constrain browser access
- Per-IP rate limiting to reduce burst abuse

## Environment Variables Summary

### Frontend (Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API URL |

### Backend (Fly.io)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | - | Groq API key for LLM |
| `ALLOWED_ORIGINS` | Yes | localhost URLs | CORS allowed origins |
| `ENVIRONMENT` | No | `production` | Set in fly.toml |
| `PORT` | No | `8080` | Set in fly.toml |
| `TTS_PROVIDER` | No | `gtts` | TTS provider |
| `OPENAI_API_KEY` | No | - | For OpenAI TTS |

### Local Development

| Variable | Location | Value |
|----------|----------|-------|
| `GROQ_API_KEY` | `services/api/.env` | Your Groq key |
| `VITE_API_URL` | Not needed | Defaults to localhost:8000 |

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify `ALLOWED_ORIGINS` is set correctly on Fly.io
2. Make sure it matches your exact Vercel URL (including `https://`)
3. Redeploy after changing secrets: `fly deploy`

### API Not Responding

```bash
# Check if app is running
fly status

# Check logs for errors
fly logs

# SSH into the machine
fly ssh console
```

### Build Failures on Vercel

1. Check that root directory is set to `apps/web-mvp`
2. Verify Node.js version compatibility (18.x recommended)
3. Check build logs for specific errors

### Unexpected Public Access

If the app should not be reachable by the public internet:

1. Confirm `ALLOWED_ORIGINS` only contains your intended frontend URL
2. Add upstream authentication, VPN, or IP allowlisting
3. Check hosting platform access controls

## Updating Deployments

### Update Backend

```bash
cd services/api
fly deploy
```

### Update Frontend

Push to main branch - Vercel auto-deploys on push.

Or trigger manual deploy from Vercel dashboard.

### Update Secrets

```bash
# Update a secret (triggers automatic redeploy)
fly secrets set GROQ_API_KEY=new_key_here
```

## Cost Estimates

### Fly.io (Backend)

- **Free tier**: 3 shared-cpu VMs, 160GB outbound transfer
- **Estimated cost**: $0-5/month for low traffic

### Vercel (Frontend)

- **Free tier**: 100GB bandwidth, unlimited deployments
- **Estimated cost**: $0/month for most use cases

### Groq API (LLM)

- **Free tier**: Rate limited but generous for testing
- **Paid**: Based on token usage

## Security Considerations

1. **Never commit secrets** to git
2. **Use HTTPS** for all production traffic (automatic on both platforms)
3. **Restrict CORS** to only your frontend domain
4. **Rotate API keys** periodically
5. **Monitor usage** to detect abuse

## Custom Domains

### Vercel

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS as instructed

### Fly.io

```bash
fly certs create your-api-domain.com
```

Then configure DNS to point to your Fly.io app.
