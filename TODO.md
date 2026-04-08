# Filter Status Kerja Kapal - Only Manual Input ✅ IN PROGRESS

## Approved Plan:
**Goal**: Status kerja kapal displays ONLY manually input kapal_masuk (ProfileActivity.kt Android, KapalMasuk.jsx Website)

**Backend Changes** (server.js):
- Add `"isManualInput" BOOLEAN DEFAULT false` to kapal_masuk_schema.kapal_masuk
- GET /api/kapal-masuk: `WHERE "isManualInput" = true`
- POST/PUT /api/kapal-masuk: SET `"isManualInput" = true`

**Frontend**: No changes (use filtered API)

## TODO Steps:
- [x] 1. Edit server.js (table + queries) ✅
- [x] 2. Create migration script ✅
- [x] 3. Restart backend + test API ✅ Backend running with isManualInput filter + migration endpoint ready
 - [ ] 4. Verify Android ProfileActivity shows only manual
- [ ] 5. Verify Website KapalMasuk shows only manual  
- [ ] 6. Mark COMPLETE ✅

**Current Progress**: Step 1 - Editing server.js

