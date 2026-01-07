# TODO: Implement Online Checklist Sync in ProfileActivity

## Backend Changes
- [x] Add checklistStates and checklistDates columns to kapal_masuk table
- [x] Update package.json to include socket.io
- [x] Modify server.js: add Socket.io setup, update kapal-masuk APIs to include new fields, add real-time emit on updates
- [x] Fix server startup to use server.listen instead of app.listen

## Android App Changes
- [x] Update KapalMasukEntity.kt to include checklistStates and checklistDates fields
- [x] Update ApiService.kt to include new fields in responses
- [x] Add Socket.io client dependency to app/build.gradle.kts
- [x] Modify ApiClient.kt to include Socket.io client setup
- [x] Modify ProfileActivity.kt: load states from API, send updates on checkbox change, listen for Socket.io updates to refresh UI
- [x] Update Socket.io URL to use Config.BASE_URL instead of localhost

## Testing
- [ ] Deploy backend to Railway
- [ ] Run migration script for checklist columns
- [ ] Test real-time sync across devices
- [ ] Ensure backward compatibility
