# KapalList Backend

Backend API untuk aplikasi KapalList menggunakan Node.js, Express, dan PostgreSQL.

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Jalankan server:
```bash
npm start
```

Untuk development:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/login` - Login user
- `POST /api/register` - Register user baru

### Users (Protected)
- `GET /api/users` - Get all users
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user

### Kapal (Protected)
- `GET /api/kapal` - Get all kapal
- `GET /api/kapal/:id` - Get kapal by ID
- `POST /api/kapal` - Create new kapal
- `PUT /api/kapal/:id` - Update kapal
- `DELETE /api/kapal/:id` - Delete kapal

### File Upload (Protected)
- `POST /api/upload` - Upload file

## Deployment ke Railway

1. Buat project baru di Railway
2. Tambahkan PostgreSQL database ke project
3. Deploy backend menggunakan Dockerfile
4. Set environment variable `DATABASE_URL` dengan connection string PostgreSQL dari Railway
5. Railway akan secara otomatis membuat volume persistent untuk direktori uploads berdasarkan konfigurasi `railway.json`
6. Update `BASE_URL` di aplikasi Android ke URL Railway yang baru

### Penyimpanan File Permanen

Aplikasi ini menggunakan Railway volumes untuk penyimpanan file (gambar dan PDF) yang permanen. Konfigurasi volume sudah disiapkan di `railway.json`:

```json
"volumes": [
  {
    "name": "kapallist-uploads",
    "mountPath": "/app/uploads"
  }
]
```

**Langkah Setup Volume di Railway:**

1. **Buat Volume di Railway Dashboard:**
   - Pergi ke project Railway Anda
   - Klik tab "Volumes" di sidebar
   - Klik "Create Volume"
   - Beri nama volume: `kapallist-uploads`
   - Pilih environment (production/staging)
   - Klik "Create"

2. **Attach Volume ke Service:**
   - Pergi ke service backend Anda
   - Klik tab "Settings"
   - Scroll ke bagian "Volumes"
   - Klik "Attach Volume"
   - Pilih volume `kapallist-uploads`
   - Set mount path: `/app/uploads`
   - Klik "Attach"

3. **Redeploy Service:**
   - Setelah volume di-attach, lakukan redeploy service
   - Volume akan otomatis mount ke path `/app/uploads`

Volume ini akan memastikan bahwa semua file yang diupload (gambar dan PDF dokumen kapal) tetap tersimpan meskipun container di-restart atau di-redeploy.

## Environment Variables

- `PORT` - Port server (default: 3000)
- `JWT_SECRET` - Secret key untuk JWT (default: 'your-super-secret-jwt-key-change-this-in-production')
- `DATABASE_URL` - PostgreSQL connection string (required for production)
- `NODE_ENV` - Environment (production/development)
