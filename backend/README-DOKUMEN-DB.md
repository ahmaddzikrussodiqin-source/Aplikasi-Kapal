# Railway Dokumen Database Setup

This guide explains how to set up Railway database support for storing images and PDFs in the `DATABASE_URL_DOKUMEN`.

## Overview

The KapalList application uses separate PostgreSQL databases for different data types:
- `DATABASE_URL_USERS` - User management
- `DATABASE_URL_KAPAL` - Ship information and status
- `DATABASE_URL_DOKUMEN` - Documents with images and PDFs
- `DATABASE_URL_KAPAL_MASUK` - Ship entries

## Setup Steps

### 1. Create Railway PostgreSQL Databases

1. Go to your [Railway dashboard](https://railway.app)
2. Create a new project or use existing one
3. Add **4 PostgreSQL databases**:
   - Database 1: Users
   - Database 2: Kapal
   - Database 3: Dokumen (for images/PDFs)
   - Database 4: Kapal Masuk

### 2. Set Environment Variables

In your Railway project Variables section, add:

```bash
# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-key-change-this-in-production-make-it-long-and-random

# Separate Databases for each schema
DATABASE_URL_USERS=postgresql://postgres:password@containers-us-west-1.railway.app:5432/users_db
DATABASE_URL_KAPAL=postgresql://postgres:password@containers-us-west-1.railway.app:5433/kapal_db
DATABASE_URL_DOKUMEN=postgresql://postgres:password@containers-us-west-1.railway.app:5434/dokumen_db
DATABASE_URL_KAPAL_MASUK=postgresql://postgres:password@containers-us-west-1.railway.app:5435/kapal_masuk_db
```

### 3. Deploy Application

Deploy your application to Railway with the new environment variables.

### 4. Initialize Dokumen Database

Run the setup script to create the dokumen table:

```bash
# Set the DATABASE_URL_DOKUMEN environment variable locally
export DATABASE_URL_DOKUMEN="your_railway_dokumen_db_url"

# Run setup script
node backend/setup-dokumen-db.js
```

### 5. Test Database Connection

Test the dokumen database functionality:

```bash
# Run test script
node backend/test-dokumen-db.js
```

## Database Schema

The dokumen table structure:

```sql
CREATE TABLE dokumen (
    id SERIAL PRIMARY KEY,
    kapalId INTEGER NOT NULL,
    nama TEXT NOT NULL,
    jenis TEXT NOT NULL,
    nomor TEXT,
    tanggalTerbit TEXT,
    tanggalKadaluarsa TEXT,
    status TEXT NOT NULL DEFAULT 'aktif',
    filePath TEXT,  -- JSON array of image/PDF URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_dokumen_kapal_id ON dokumen(kapalId);
CREATE INDEX idx_dokumen_status ON dokumen(status);
CREATE INDEX idx_dokumen_created_at ON dokumen(created_at);
```

## File Storage

Images and PDFs are stored as JSON in the `filePath` column:

```json
{
  "images": [
    "https://your-app.railway.app/uploads/image1.jpg",
    "https://your-app.railway.app/uploads/image2.png"
  ],
  "pdfs": [
    "https://your-app.railway.app/uploads/document1.pdf",
    "https://your-app.railway.app/uploads/document2.pdf"
  ]
}
```

## API Endpoints

- `POST /api/upload` - Upload files to server
- `GET /api/dokumen` - Get all documents
- `GET /api/dokumen/kapal/:kapalId` - Get documents by ship ID
- `POST /api/dokumen` - Create new document
- `PUT /api/dokumen/:id` - Update document
- `DELETE /api/dokumen/:id` - Delete document

## Checklist

- [ ] 4 PostgreSQL databases created in Railway
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Dokumen database initialized (`setup-dokumen-db.js`)
- [ ] Database connection tested (`test-dokumen-db.js`)
- [ ] File upload functionality verified
- [ ] Cross-device synchronization tested

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL_DOKUMEN is correctly set
- Check Railway database credentials
- Ensure SSL settings are correct for production

### File Upload Issues
- Check `/uploads` directory permissions
- Verify file size limits in Railway
- Test with small files first

### Performance Issues
- Monitor database query performance
- Check index usage
- Consider database scaling if needed

## Support

For issues with Railway database setup, check:
- Railway documentation: https://docs.railway.app/
- PostgreSQL documentation for Railway
- Application logs in Railway dashboard
