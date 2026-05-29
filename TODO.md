# TODO - Status Kerja Kapal New Database Implementation

## Task Summary
- Hilangkan penggunaan database Kapal-masuk (`kapal_masuk_schema.kapal_masuk`)
- Buat database baru untuk Status Kerja Kapal

## Implementation Plan

### Step 1: Update deploy.sh
- Remove explicit migration script calls (not needed)
- Add logic to detect Railway or local database
- Let server initialize schemas on startup

### Step 2: Update server.js 
- Check existing table columns before queries
- Add missing column "kapalId" to status_kerja_kapal if needed

### Step 3: Deploy and Test
- Deploy to Railway
- Test website functionality

## Progress Log
- [x] 1. Backend server.js updated to use getStatusKerjaPool()
- [x] 2. deploy.sh updated
- [ ] 3. Deploy to Railway
- [ ] 4. Test website functionality
