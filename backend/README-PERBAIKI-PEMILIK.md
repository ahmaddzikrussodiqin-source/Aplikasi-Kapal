# 🚀 Cara Fix Pemilik Kapal di Status Kerja (Langkah demi Langkah)

## Prasyarat
```
1. Backend sudah push ke Railway (git push) & redeploy sukses
2. Login app dengan akun Moderator (role: Moderator)
3. Token dari login (Developer Tools → Network → Authorization header)
```

## Step 1: Test Auto-Fill Logic (Baru)
```
curl -X POST https://aplikasi-kapal-production.up.railway.app/api/kapal-masuk \\
-H "Authorization: Bearer [YOUR_TOKEN]" \\
-H "Content-Type: application/json" \\
-d '{"nama": "KM Bintang Mas", "tanggalKembali": "2024-10-10", "listPersiapan": []}'
```
Expected: Server log "Auto-filling... Filled pemilik: [Nama]"

## Step 2: Fix Semua Data Lama (Backfill 5 records)
```
curl -X POST https://aplikasi-kapal-production.up.railway.app/api/admin/backfill-pemilik \\
-H "Authorization: Bearer [YOUR_TOKEN]"
```
Expected: `{"success":true, "message":"Backfill complete: 5/5 fixed"}`

## Step 3: Verify Data
```
curl -H "Authorization: Bearer [YOUR_TOKEN]" \\
"https://aplikasi-kapal-production.up.railway.app/api/kapal-masuk" | grep -i pemilik
```
Expected: `"namaPemilik":"John Doe"` (not "")

## Step 4: Test Android App
```
1. ./gradlew clean installDebug
2. Run app → ProfileActivity → Status kerja → Pemilik terisi!
```

## Jika Masih Error
**Share output Step 3** (`curl /api/kapal-masuk | jq '.[].{id,nama,namaPemilik}'`)

**Railway Logs:** Railway dashboard → Logs → cari "Auto-filling" atau error

## Manual Backfill (Local Script)
```
cd Aplikasi-Kapal/backend
export TEST_TOKEN="your_token_here"
node fix-pemilik-kapal-masuk.js
```

Sekarang pemilik kapal muncul di Status Kerja! 🎉
