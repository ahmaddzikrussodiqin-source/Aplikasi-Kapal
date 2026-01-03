# Implementasi Database Terpisah di Railway

## Status: ✅ COMPLETED - Ready for Deployment

### ✅ Langkah yang Telah Selesai:

1. **✅ Analisis Kode Backend**
   - Menganalisis struktur server.js yang menggunakan satu database dengan multiple schemas
   - Mengidentifikasi routes untuk USER, Kapal, Dokumen, dan Kapal Masuk

2. **✅ Refactoring Database Setup**
   - Mengubah dari satu `dbPool` menjadi empat pool terpisah:
     - `usersPool` untuk database USER
     - `kapalPool` untuk database Kapal
     - `dokumenPool` untuk database Dokumen
     - `kapalMasukPool` untuk database Kapal Masuk

3. **✅ Update Environment Variables**
   - Mengubah dari `DATABASE_URL` tunggal menjadi:
     - `DATABASE_URL_USERS`
     - `DATABASE_URL_KAPAL`
     - `DATABASE_URL_DOKUMEN`
     - `DATABASE_URL_KAPAL_MASUK`

4. **✅ Update Routes**
   - Mengubah semua routes untuk menggunakan pool yang sesuai
   - Menghapus referensi schema (seperti `users_schema.users` → `users`)
   - Update debug endpoint untuk mengecek semua database

5. **✅ Update Graceful Shutdown**
   - Mengubah shutdown handler untuk menutup semua empat pool

6. **✅ Create Helper Scripts**
   - `setup-railway-env.sh` - Panduan setup environment variables
   - `test-separate-databases.js` - Script untuk test koneksi database

### 🚀 Langkah Selanjutnya untuk Deployment:

#### 1. Set Environment Variables di Railway
```
DATABASE_URL_USERS=postgresql://user:pass@host:5432/users_db
DATABASE_URL_KAPAL=postgresql://user:pass@host:5432/kapal_db
DATABASE_URL_DOKUMEN=postgresql://user:pass@host:5432/dokumen_db
DATABASE_URL_KAPAL_MASUK=postgresql://user:pass@host:5432/kapal_masuk_db
JWT_SECRET=your-jwt-secret
```

#### 2. Redeploy Aplikasi
- Push kode terbaru ke repository
- Railway akan otomatis redeploy

#### 3. Test Koneksi Database
```bash
cd backend
node test-separate-databases.js
```

#### 4. Test API Endpoints
- Test login/register (users database)
- Test CRUD kapal (kapal database)
- Test CRUD dokumen (dokumen database)
- Test CRUD kapal masuk (kapal masuk database)

### 📋 Checklist Deployment:

- [ ] 4 database PostgreSQL sudah dibuat di Railway
- [ ] Environment variables sudah diset
- [ ] Aplikasi sudah redeploy
- [ ] Test koneksi database berhasil (4/4)
- [ ] Semua API endpoints berfungsi normal
- [ ] Data migration dari database lama (jika ada)

### 🎯 Keuntungan Implementasi:

- **Isolasi Data**: Setiap modul memiliki database sendiri
- **Scalability**: Dapat scale setiap database secara independen
- **Security**: Lebih mudah mengatur permission per database
- **Maintenance**: Backup dan restore per modul lebih mudah

### 🆘 Troubleshooting:

Jika ada error koneksi:
1. Pastikan DATABASE_URL format benar
2. Check Railway logs untuk error details
3. Pastikan database accessible dari aplikasi
4. Verify SSL settings untuk production
