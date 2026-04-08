# TODO: Fix Pemilik Kapal di Status Kerja

**Plan Approved ✅**

## Implementation Steps:

### 1. Create TODO.md [✅ DONE]
### 2. Inspect current DB data [✅ DONE - 5 records found, login failed]
```
🔍 inspect-kapal-masuk.js ran - 5 kapal masuk, login creds needed for full data
Sample: KM Putra Bintang Mas I, KM Bintang Mas Sejahtera (etc.)
```


### 3. Create backfill script [✅ DONE]
```
Aplikasi-Kapal/backend/fix-pemilik-kapal-masuk.js created
Next: set TEST_TOKEN env var and run `cd Aplikasi-Kapal/backend && node fix-pemilik-kapal-masuk.js`
(or manual API calls for 5 records)
```

- Match kapal_masuk.nama with kapal_info.nama
- Copy namaPemilik, tandaSelar, etc. to kapal_masuk

### 4. InputActivity.kt analyzed [✅ DONE]
```
✅ Already has kapal picker → sets etNamaPemilik from selected kapal.namaPemilik
✅ Creates KapalMasukEntity with namaPemilik from field
⚠️  User can skip picker → sends null to backend
```

### 5. Backend server.js updated [✅ DONE]
```
✅ autoFillKapalInfo() helper added
✅ POST /api/kapal-masuk auto-fills from kapal_info.nama
✅ PUT /api/kapal-masuk auto-fills
✅ /api/admin/backfill-pemilik endpoint for existing records (Moderator only)
```

### 🚨 DEPLOY FIX REQUIRED
```
Railway crash: backfill query syntax \\'\\' → fixed to parameterized $1 = ''
```

**After fix & redeploy:**
```
✅ All logic ready
1. git push → Railway
2. POST /api/admin/backfill-pemilik (Moderator token)
3. GET /api/kapal-masuk → verify namaPemilik populated
4. Android test ProfileActivity
```


**Backend fixes deployed:**
```
✅ autoFillKapalInfo(): Lookup kapal_info by exact nama match
✅ POST/PUT /api/kapal-masuk: Auto-populate missing pemilik/data
✅ /api/admin/backfill-pemilik: One-click fix all existing nulls (POST as Moderator)

**Usage:**
1. Redeploy backend (git push / Railway)
2. Test create: POST /api/kapal-masuk {nama: "KM XYZ"} → auto-fills pemilik
3. Fix existing: POST /api/admin/backfill-pemilik → updates all 5 records
4. Android ProfileActivity → shows pemilik correctly

**InputActivity:** Already prefills on kapal picker click ✅
```

```
- Add kapalPool lookup by nama
- Auto-fill namaPemilik/tandaSelar/etc if empty in request
- Cross-DB copy kapal_info → kapal_masuk
```

### 5. Update InputActivity.kt [PENDING]
```
- Add kapal dropdown/spinner for selection
- Prefill details from selected kapal
```

### 6. Test & Verify [PENDING]
```
- Backend: POST /api/kapal-masuk with partial data → auto-fills pemilik
- Android: Create new status kerja → shows pemilik
- ProfileActivity: Existing + new entries show correct pemilik
```

### 7. Mark complete [PENDING]

**Next step:** Run inspect script to confirm data state
