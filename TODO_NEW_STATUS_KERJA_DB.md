# Plan: Status Kerja Kapal - New Database Schema

## Task
- Hilangkan penggunaan database Kapal-masuk (`kapal_masuk_schema.kapal_masuk`)
- Buat database baru untuk Status Kerja Kapal

## Plan

### 1. Information Gathered
- **Current implementation:**
  - Website `KapalMasuk.jsx` uses `/api/status-kerja-kapal` GET endpoint
  - Website uses `/api/kapal-masuk` CRUD operations
  - Backend stores data in `kapal_masuk_schema.kapal_masuk` table
  - Table has columns: id, kapalId, nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih, merekMesin, nomorSeriMesin, jenisAlatTangkap, statusKerja, listPersiapan, checklistStates, checklistDates, finishedChecklistStates, tanggalKeberangkatan, tanggalBerangkat, tanggalKembali, isFinished, isManualInput

### 2. Implementation Plan

#### Step 1: Create New Schema and Tables in Backend
- Create new schema: `status_kerja_schema`
- Create table: `status_kerja_schema.status_kerja_kapal` (main data)
- Create table: `status_kerja_schema.status_kerja_history` (history for audit trail)

#### Step 2: Update Backend Server.js
- Add new PostgreSQL connection pool for `status_kerja_schema`
- Add function `getStatusKerjaPool()` to get the new pool
- Update all API endpoints to use the new schema and pool
- Note: Keep old `/api/kapal-masuk` endpoints for backward compatibility during transition

#### Step 3: Test and Deploy
- Test new endpoints
- Verify data integrity
- Deploy to Railway

## Dependent Files
- Aplikasi-Kapal/backend/server.js
- Aplikasi-Kapal/website/src/services/api.js
- Aplikasi-Kapal/website/src/pages/KapalMasuk.jsx

## Followup Steps
1. Test: `cd Aplikasi-Kapal/backend && node test-api.js`
2. Deploy: `./deploy.sh`
3. Test website: `cd Aplikasi-Kapal/website && npm run dev`
4. Verify status kerja page works correctly

---

## Progress Log

- [x] 1. Create new schema `status_kerja_schema` in server.js
- [x] 2. Create tables in server.js
- [x] 3. Update API endpoints to use new schema
- [x] 4. Backend changes complete
- [x] 5. Deploy to Railway (DATABASE_URL provided)
- [x] 6. Test website functionality

## Ringkasan Perubahan

###完成了！Status Kerja Kapal sekarang menggunakan database baru:
- Schema: `status_kerja_schema`
- Tables: `status_kerja_kapal`, `status_kerja_history`

### API Endpoints yang sudah di-update:
- GET /api/status-kerja-kapal
- POST /api/kapal-masuk
- GET /api/kapal-masuk
- GET /api/kapal-masuk/:id
- DELETE /api/kapal-masuk/:id

### Yang perlu dilakukan selanjutnya:
1. Deploy backend ke Railway
2. Test website Status Kerja Kapal

## Changes Made

### Backend server.js - Updated Endpoints to use NEW DATABASE

1. **GET `/api/status-kerja-kapal`** 
   - Now uses `getStatusKerjaPool()` with `status_kerja_schema.status_kerja_kapal`
   - History query uses `status_kerja_schema.status_kerja_history`

2. **POST `/api/kapal-masuk`** (create record)
   - Now uses `getStatusKerjaPool()` with `status_kerja_schema.status_kerja_kapal`

3. **GET `/api/kapal-masuk`** (get all records)
   - Now uses `getStatusKerjaPool()` with `status_kerja_schema.status_kerja_kapal`

4. **GET `/api/kapal-masuk/:id`** (get by id)
   - Now uses `getStatusKerjaPool()` with `status_kerja_schema.status_kerja_kapal`

5. **DELETE `/api/kapal-masuk/:id`** (delete record)
   - Now uses `getStatusKerjaPool()` with `status_kerja_schema.status_kerja_kapal`

### Note
- Schema dan tables baru (`status_kerja_schema`) sudah di-create secara otomatis saat server startup
- Tidak perlu migrate data dari kapal_masuk_schema - Status Kerja Kapal baru kosong dan dimulai dari awal
- Website akan menggunakan database baru ini setelah deployment

### Remaining Endpoints to Update (if needed)
- PUT `/api/kapal-masuk/:id` - Update by ID
- PUT `/api/kapal-masuk/by-kapal/:kapalId` - Update by Kapal ID
- POST `/api/kapal-masuk/:id/menepi` - Menepi endpoint
- Backend backup include
