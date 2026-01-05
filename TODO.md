# KapalList Railway Deployment Fix

## Issue
Railway deployment was failing due to missing DATABASE_URL_DOKUMEN environment variable, causing server crashes.

## Solution
Made the dokumen database optional to prevent deployment failures when DATABASE_URL_DOKUMEN is not configured.

## Changes Made

### Backend Changes
- [x] Modified `backend/server.js` to make dokumenPool optional
- [x] Added availability checks to all dokumen API routes (GET, POST, PUT, DELETE)
- [x] Updated database connection logic to filter out null pools
- [x] Updated debug endpoint to handle missing dokumen database
- [x] Updated graceful shutdown to filter out null pools

### Documentation Changes
- [x] Updated `backend/README-DOKUMEN-DB.md` to mark dokumen database as optional
- [x] Updated setup checklist to reflect optional nature of dokumen features

## Testing
- [ ] Deploy to Railway without DATABASE_URL_DOKUMEN set
- [ ] Verify core functionality works (users, kapal, kapal-masuk)
- [ ] Verify dokumen endpoints return 503 when database not configured
- [ ] Deploy with DATABASE_URL_DOKUMEN set and verify full functionality

## Next Steps
1. Test deployment without dokumen database
2. If successful, the issue is resolved
3. If still failing, investigate other potential causes
