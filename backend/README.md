# KapalList Backend

Backend API untuk aplikasi KapalList menggunakan Node.js, Express, dan SQLite.

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

## Deployment ke IDCloudHost

1. Upload semua file backend ke server Anda
2. Install Node.js di server
3. Install dependencies: `npm install`
4. Jalankan server: `npm start`
5. Pastikan port yang digunakan dapat diakses

## Environment Variables

- `PORT` - Port server (default: 3000)
- `JWT_SECRET` - Secret key untuk JWT (default: 'your-secret-key')
