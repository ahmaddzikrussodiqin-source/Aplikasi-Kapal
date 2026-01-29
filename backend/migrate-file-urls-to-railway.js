const { Pool } = require('pg');

// Railway URL for production
const RAILWAY_URL = 'https://aplikasi-kapal-production.up.railway.app';

async function migrateFileUrlsToRailway() {
    console.log('🚀 Starting file URL migration to Railway...');

    // Database connection
    const kapalPool = new Pool({
        connectionString: process.env.DATABASE_URL_KAPAL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        // Get all dokumen with filePath
        const result = await kapalPool.query(`
            SELECT id, kapalId, jenis, "filePath"
            FROM dokumen
            WHERE "filePath" IS NOT NULL
            AND "filePath" != ''
            ORDER BY id
        `);

        console.log(`📊 Found ${result.rows.length} documents with file paths`);

        let updatedCount = 0;

        for (const doc of result.rows) {
            try {
                console.log(`\n🔄 Processing document ID ${doc.id} (${doc.jenis})`);

                // Parse current filePath
                let fileData;
                try {
                    fileData = JSON.parse(doc.filePath);
                } catch (parseErr) {
                    console.log(`⚠️  Skipping document ${doc.id} - invalid JSON in filePath`);
                    continue;
                }

                let needsUpdate = false;
                const updatedFileData = {
                    images: [],
                    pdfs: []
                };

                // Update image URLs
                if (fileData.images && Array.isArray(fileData.images)) {
                    for (const imgUrl of fileData.images) {
                        if (imgUrl && typeof imgUrl === 'string') {
                            // Check if URL contains localhost or old Railway URL
                            if (imgUrl.includes('localhost:3000') ||
                                imgUrl.includes('http://localhost') ||
                                imgUrl.includes('127.0.0.1')) {
                                // Extract filename and create new Railway URL
                                const filename = imgUrl.split('/').pop();
                                const newUrl = `${RAILWAY_URL}/uploads/${filename}`;
                                updatedFileData.images.push(newUrl);
                                needsUpdate = true;
                                console.log(`   📸 Updated image URL: ${imgUrl} → ${newUrl}`);
                            } else {
                                updatedFileData.images.push(imgUrl);
                            }
                        }
                    }
                }

                // Update PDF URLs
                if (fileData.pdfs && Array.isArray(fileData.pdfs)) {
                    for (const pdfUrl of fileData.pdfs) {
                        if (pdfUrl && typeof pdfUrl === 'string') {
                            // Check if URL contains localhost or old Railway URL
                            if (pdfUrl.includes('localhost:3000') ||
                                pdfUrl.includes('http://localhost') ||
                                pdfUrl.includes('127.0.0.1')) {
                                // Extract filename and create new Railway URL
                                const filename = pdfUrl.split('/').pop();
                                const newUrl = `${RAILWAY_URL}/uploads/${filename}`;
                                updatedFileData.pdfs.push(newUrl);
                                needsUpdate = true;
                                console.log(`   📄 Updated PDF URL: ${pdfUrl} → ${newUrl}`);
                            } else {
                                updatedFileData.pdfs.push(pdfUrl);
                            }
                        }
                    }
                }

                // Update database if changes were made
                if (needsUpdate) {
                    const updateQuery = `
                        UPDATE dokumen
                        SET "filePath" = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;

                    await kapalPool.query(updateQuery, [
                        JSON.stringify(updatedFileData),
                        doc.id
                    ]);

                    updatedCount++;
                    console.log(`✅ Updated document ${doc.id} with ${updatedFileData.images.length} images and ${updatedFileData.pdfs.length} PDFs`);
                } else {
                    console.log(`ℹ️  No changes needed for document ${doc.id}`);
                }

            } catch (docErr) {
                console.error(`❌ Error processing document ${doc.id}:`, docErr.message);
            }
        }

        console.log(`\n🎉 Migration completed! Updated ${updatedCount} documents.`);

        if (updatedCount > 0) {
            console.log('\n📋 Summary:');
            console.log(`- Total documents processed: ${result.rows.length}`);
            console.log(`- Documents updated: ${updatedCount}`);
            console.log(`- Railway URL used: ${RAILWAY_URL}`);
        }

        return {
            success: true,
            message: 'Migration completed successfully',
            data: {
                totalProcessed: result.rows.length,
                updatedCount: updatedCount,
                railwayUrl: RAILWAY_URL
            }
        };

    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    } finally {
        await kapalPool.end();
    }
}

module.exports = migrateFileUrlsToRailway;
