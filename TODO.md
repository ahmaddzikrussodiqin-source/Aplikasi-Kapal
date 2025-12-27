# TODO: Fix Document Saving to Railway Database

## Current Status
- Documents are stored as JSON in kapal table instead of separate dokumen table
- Need to integrate with Railway database via API

## Tasks
- [ ] Update DokumenEntity.kt to match backend schema
- [ ] Modify DocumentActivity.kt to use dokumen API endpoints
- [ ] Handle file uploads via /api/upload endpoint
- [ ] Test API integration
- [ ] Update UI if needed

## Files to Modify
- DokumenEntity.kt
- DocumentActivity.kt
- ApiService.kt (verify endpoints)
