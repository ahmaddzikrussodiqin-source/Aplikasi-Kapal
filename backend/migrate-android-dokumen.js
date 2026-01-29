const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connections
const dbPath = path.join(__dirname, 'kapallist.db');
const kapalPool = new Pool({
    connectionString: process.env.DATABASE_URL_KAPAL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateAndroidDokumen() {
    console.log('🚀 Starting Android to Website Dokumen Migration...');

    // Check if Android database exists
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Android database file not found at:', dbPath);
        console.log('Please copy kapallist.db from your Android device to the backend directory.');
        console.log('Use: adb pull /data/data/com.example.kapallist/databases/kapallist.db ./backend/');
        process.exit(1);
    }

    // Connect to Android SQLite database
    const androidDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error opening Android database:', err.message);
            process.exit(1);
        }
        console.log('✅ Connected to Android SQLite database');
    });

    try {
        // Get all dokumen from Android database
        const androidDokumen = await new Promise((resolve, reject) => {
            androidDb.all(`
                SELECT id, kapalId, nama, jenis, nomor, tanggalTerbit, tanggalKadaluarsa, status, filePath
                FROM dokumen_table
                WHERE filePath IS NOT NULL AND filePath != ''
                ORDER BY id
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        console.log(`📊 Found ${androidDokumen.length} documents with files in Android database`);

        if (androidDokumen.length === 0) {
            console.log('ℹ️  No documents with files found in Android database');
            return;
        }

        // Process each document
        let migratedCount = 0;
        let fileCopyCommands = [];

        for (const doc of androidDokumen) {
            try {
                console.log(`\n🔄 Processing document ID ${doc.id} (${doc.jenis})`);

                // Parse Android file paths
                let fileData;
                try {
                    fileData = JSON.parse(doc.filePath);
                } catch (parseErr) {
                    console.log(`⚠️  Skipping document ${doc.id} - invalid JSON in filePath`);
                    continue;
                }

                // Convert Android paths to web URLs
                const webFileData = {
                    images: [],
                    pdfs: []
                };

                // Process images
                if (fileData.images && Array.isArray(fileData.images)) {
                    for (const imgPath of fileData.images) {
                        if (imgPath && typeof imgPath === 'string') {
                            // Extract filename from Android path
                            const filename = path.basename(imgPath);
                            const webUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/uploads/${filename}`;

                            webFileData.images.push(webUrl);

                            // Add to copy commands
                            fileCopyCommands.push({
                                source: imgPath,
                                destination: path.join(__dirname, 'uploads', filename),
                                type: 'image'
                            });
                        }
                    }
                }

                // Process PDFs
                if (fileData.pdfs && Array.isArray(fileData.pdfs)) {
                    for (const pdfPath of fileData.pdfs) {
                        if (pdfPath && typeof pdfPath === 'string') {
                            // Extract filename from Android path
                            const filename = path.basename(pdfPath);
                            const webUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/uploads/${filename}`;

                            webFileData.pdfs.push(webUrl);

                            // Add to copy commands
                            fileCopyCommands.push({
                                source: pdfPath,
                                destination: path.join(__dirname, 'uploads', filename),
                                type: 'pdf'
                            });
                        }
                    }
                }

                // Skip if no valid files
                if (webFileData.images.length === 0 && webFileData.pdfs.length === 0) {
                    console.log(`⚠️  Skipping document ${doc.id} - no valid files found`);
                    continue;
                }

                // Insert into PostgreSQL database
                const insertQuery = `
                    INSERT INTO dokumen (
                        kapalId, nama, jenis, nomor, tanggalTerbit, tanggalKadaluarsa,
                        status, filePath, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    ON CONFLICT (kapalId, jenis) DO UPDATE SET
                        nama = EXCLUDED.nama,
                        nomor = EXCLUDED.nomor,
                        tanggalTerbit = EXCLUDED.tanggalTerbit,
                        tanggalKadaluarsa = EXCLUDED.tanggalKadaluarsa,
                        status = EXCLUDED.status,
                        filePath = EXCLUDED.filePath,
                        updated_at = CURRENT_TIMESTAMP
                `;

                await kapalPool.query(insertQuery, [
                    doc.kapalId,
                    doc.nama || '',
                    doc.jenis || '',
                    doc.nomor || null,
                    doc.tanggalTerbit || null,
                    doc.tanggalKadaluarsa || null,
                    doc.status || 'aktif',
                    JSON.stringify(webFileData)
                ]);

                migratedCount++;
                console.log(`✅ Migrated document ${doc.id} with ${webFileData.images.length} images and ${webFileData.pdfs.length} PDFs`);

            } catch (docErr) {
                console.error(`❌ Error migrating document ${doc.id}:`, docErr.message);
            }
        }

        console.log(`\n🎉 Migration completed! Migrated ${migratedCount} documents.`);

        // Show file copy instructions
        if (fileCopyCommands.length > 0) {
            console.log('\n📋 Files to copy from Android device:');
            console.log('=====================================');

            fileCopyCommands.forEach((cmd, index) => {
                console.log(`${index + 1}. ${cmd.type.toUpperCase()}: ${cmd.source}`);
                console.log(`   → ${cmd.destination}`);
                console.log('');
            });

            console.log('Copy these files to the backend/uploads/ directory.');
            console.log('Example commands:');
            console.log('# Using ADB:');
            console.log('adb pull "' + fileCopyCommands[0].source + '" ./backend/uploads/');
            console.log('');
            console.log('# Or manually copy from Android device storage');
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('📁 Created uploads directory');
        }

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        // Close databases
        androidDb.close();
        await kapalPool.end();
    }
}

// Run migration
migrateAndroidDokumen().catch(console.error);
