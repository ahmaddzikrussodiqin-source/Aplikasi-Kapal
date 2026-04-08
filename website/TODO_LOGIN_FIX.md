# Login Fix - Production CORS/HTTPS

## Root Cause
Production env vars forced `API_BASE_URL` to `http://localhost:3000`.

## Implemented
- `.env.development`: Localhost config
- `.env.production`: Railway production URLs

## Required Railway Actions (website service)
```
VITE_APP_MODE=production
VITE_BACKEND_URL=https://aplikasi-kapal-production.up.railway.app
```

## Deploy
```bash
cd Aplikasi-Kapal/website
railway up
```

## Test
1. https://website-production-0b71.up.railway.app/login
2. Network tab: /api/login → HTTPS backend
3. Backend test: `curl -X POST https://aplikasi-kapal-production.up.railway.app/api/login ...`

## Backend URL Confirm
Verify in Railway dashboard (aplikasi-kapal service).
