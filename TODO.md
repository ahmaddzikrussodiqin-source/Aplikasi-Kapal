# TODO: Separate Databases Implementation

## Backend Changes
- [ ] Modify server.js to use 4 separate database connections (schemas)
- [ ] Create separate tables for each schema: users, kapal, dokumen, kapal_masuk
- [ ] Update API endpoints to use respective schemas
- [ ] Update environment variables for multiple database URLs

## Android App Changes
- [ ] Remove Room database usage from all activities
- [ ] Update ApiService.kt to include all CRUD operations for each entity
- [ ] Update Config.kt with new API endpoints
- [ ] Modify all activities to use API calls instead of local database
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
