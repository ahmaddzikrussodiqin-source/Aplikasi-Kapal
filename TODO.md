## Backend Changes
- [x] Modify server.js to use 4 separate database connections (schemas)
- [x] Create separate tables for each schema: users, kapal, dokumen, kapal_masuk
- [x] Update API endpoints to use respective schemas
- [x] Update environment variables for multiple database URLs

## Android App Changes
- [x] Update ApiService.kt to include all CRUD operations for each entity
- [x] Create DokumenEntity.kt
- [x] Create API request/response data classes (LoginRequest, RegisterRequest, etc.)
- [x] Update MainActivity.kt to use API calls instead of local database
- [x] Update LoginActivity.kt to remove database usage
- [x] Update DaftarKapalActivity.kt to use API calls instead of local database
- [x] Fix compilation errors in ApiService.kt
- [ ] Update Config.kt with new API endpoints
- [ ] Modify remaining activities (InputActivity, DocumentActivity, ProfileActivity)
- [ ] Update data models if needed for API communication

## Testing
- [ ] Test backend API endpoints
- [ ] Test Android app functionality
- [ ] Verify data synchronization

## Files to Modify
### Backend
- backend/server.js
- backend/package.json (if needed)

### Android App
- app/src/main/java/com/example/kapallist/ApiService.kt
- app/src/main/java/com/example/kapallist/Config.kt
- app/src/main/java/com/example/kapallist/MainActivity.kt
- app/src/main/java/com/example/kapallist/LoginActivity.kt
- app/src/main/java/com/example/kapallist/DaftarKapalActivity.kt
- app/src/main/java/com/example/kapallist/InputActivity.kt
- app/src/main/java/com/example/kapallist/DocumentActivity.kt
- app/src/main/java/com/example/kapallist/ProfileActivity.kt

### Files to Remove
- All Room database files (*.kt database, dao, entity files)
