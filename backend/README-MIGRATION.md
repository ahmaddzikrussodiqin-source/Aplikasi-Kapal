# Android to Website Dokumen Migration Guide

This guide explains how to migrate dokumen data from the Android app to the website.

## 🚨 Problem

The website shows no documents with uploaded files because the data hasn't been migrated from the Android SQLite database to the website PostgreSQL database.

## 📋 Migration Steps

### 1. Export Android Database

Get the `kapallist.db` file from your Android device:

#### Option A: Using ADB
```bash
# Connect Android device
adb devices

# Pull database file
adb pull /data/data/com.example.kapallist/databases/kapallist.db ./backend/
```

#### Option B: Using Android Studio
1. Open Android Studio
2. Connect device
3. Go to **Device File Explorer**
4. Navigate to: `data/data/com.example.kapallist/databases/`
5. Right-click `kapallist.db` → **Save as...**
6. Save to `backend/kapallist.db`

### 2. Install Dependencies

```bash
cd backend
npm install sqlite3
```

### 3. Run Migration Script

```bash
# Make sure DATABASE_URL_KAPAL is set
node migrate-android-dokumen.js
```

### 4. Copy Files to Website

The script will show you which files need to be copied. Copy them from Android to `backend/uploads/`:

```bash
# Example commands (from Android device)
cp /storage/emulated/0/Android/data/com.example.kapallist/files/image1.jpg ./backend/uploads/
cp /storage/emulated/0/Android/data/com.example.kapallist/files/document1.pdf ./backend/uploads/
```

### 5. Restart Backend

```bash
# Restart the backend server
npm start
```

### 6. Verify Migration

Check that documents appear in the website:
- Go to Dokumen page
- Select a ship
- Verify documents with files are displayed

## 🔧 Script Details

The migration script:
- ✅ Reads from Android SQLite `dokumen_table`
- ✅ Converts Android file paths to web URLs
- ✅ Inserts data into PostgreSQL `dokumen` table
- ✅ Provides list of files to copy
- ✅ Handles errors gracefully

## 📊 Data Mapping

| Android (SQLite) | Website (PostgreSQL) |
|------------------|---------------------|
| `id` | `id` (auto-generated) |
| `kapalId` | `kapalId` |
| `nama` | `nama` |
| `jenis` | `jenis` |
| `nomor` | `nomor` |
| `tanggalTerbit` | `tanggalTerbit` |
| `tanggalKadaluarsa` | `tanggalKadaluarsa` |
| `status` | `status` |
| `filePath` (JSON) | `filePath` (converted JSON) |
| `created_at` | `created_at` |

## 🛠️ File Path Conversion

Android file paths are converted from:
```json
{
  "images": ["/storage/emulated/0/Android/data/com.example.kapallist/files/image1.jpg"],
  "pdfs": ["/storage/emulated/0/Android/data/com.example.kapallist/files/doc1.pdf"]
}
```

To web URLs:
```json
{
  "images": ["http://localhost:3000/uploads/image1.jpg"],
  "pdfs": ["http://localhost:3000/uploads/doc1.pdf"]
}
```

## 🚨 Troubleshooting

### Migration fails
- Check that `kapallist.db` exists in `backend/` directory
- Verify `DATABASE_URL_KAPAL` environment variable is set
- Check file permissions

### Files not displaying
- Ensure files are copied to `backend/uploads/` directory
- Check file permissions (should be readable)
- Verify backend server is running

### Database connection issues
- Check PostgreSQL connection string
- Verify database credentials
- Check network connectivity

## 🚨 File URL Migration to Railway

### Problem
File URLs in database are using localhost instead of Railway production URL, causing images and PDFs to be inaccessible.

### Solution
Run the migration script on Railway to update all file URLs:

```bash
# In Railway deployment, run:
cd backend && node migrate-file-urls-to-railway.js
```

### What the script does:
- ✅ Finds all documents with file paths
- ✅ Updates localhost URLs to Railway URLs
- ✅ Preserves existing Railway URLs
- ✅ Updates both images and PDFs

### Expected output:
```
🚀 Starting file URL migration to Railway...
📊 Found X documents with file paths
🔄 Processing document ID X (jenis)
   📸 Updated image URL: old_url → new_railway_url
   📄 Updated PDF URL: old_url → new_railway_url
✅ Updated document X with Y images and Z PDFs
🎉 Migration completed! Updated X documents.
```

## 📞 Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all prerequisites are met
3. Check file permissions and paths
4. Ensure backend server can access the uploads directory
