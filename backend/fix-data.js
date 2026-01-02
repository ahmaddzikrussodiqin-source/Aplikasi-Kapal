const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixKapalMasukData() {
    try {
        console.log('🔧 Starting data fix process...');

        // Get all kapal masuk data
        const result = await pool.query('SELECT * FROM kapal_masuk_schema.kapal_masuk ORDER BY id');
        const kapalMasukData = result.rows;

        console.log(`📊 Found ${kapalMasukData.length} records to check/fix`);

        for (const record of kapalMasukData) {
            console.log(`\n🔍 Checking record ID: ${record.id}`);

            let needsUpdate = false;
            const fixedData = { ...record };

            // Fix listPersiapan - ensure it's a proper JSON array
            if (record.listpersiapan) {
                try {
                    // Try to parse as JSON first
                    let parsed = JSON.parse(record.listpersiapan);
                    if (!Array.isArray(parsed)) {
                        // If it's not an array, try to convert it
                        if (typeof parsed === 'string') {
                            parsed = parsed.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0);
                        } else {
                            parsed = [];
                        }
                        needsUpdate = true;
                    }
                    fixedData.listpersiapan = JSON.stringify(parsed);
                } catch (e) {
                    // If JSON.parse fails, try to parse as string
                    console.log(`⚠️  Malformed listPersiapan for ID ${record.id}: ${record.listpersiapan}`);
                    const parsed = record.listpersiapan
                        .replace(/[\[\]"]/g, '') // Remove brackets and quotes
                        .split(/[,;\n]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                    fixedData.listpersiapan = JSON.stringify(parsed);
                    needsUpdate = true;
                }
            }

            // Check for duplicate fields by examining the raw data
            // This is a simplified check - in a real scenario you'd need more sophisticated parsing
            const rawData = JSON.stringify(record);
            const duplicateFields = [
                'tandaselar', 'beratkotor', 'beratbersih', 'merekmesin',
                'nomorserimesin', 'jenisalattangkap', 'tanggalkeberangkatan',
                'totalharipersiapan', 'tanggalberangkat', 'tanggalkembali',
                'perkiraankeberangkatan', 'durasiselesaiPersiapan', 'durasiberlayar'
            ];

            for (const field of duplicateFields) {
                const regex = new RegExp(`"${field}":`, 'g');
                const matches = rawData.match(regex);
                if (matches && matches.length > 1) {
                    console.log(`⚠️  Duplicate field "${field}" found in record ID ${record.id}`);
                    // For now, we'll keep the last occurrence
                    needsUpdate = true;
                }
            }

            // Ensure all required fields have proper defaults
            const requiredFields = {
                namapemilik: '',
                tandaselar: '',
                tandapengenal: '',
                beratkotor: '',
                beratbersih: '',
                merekmesin: '',
                nomorserimesin: '',
                jenisalattangkap: '',
                tanggalinput: null,
                tanggalkeberangkatan: null,
                totalharipersiapan: null,
                tanggalberangkat: null,
                tanggalkembali: null,
                listpersiapan: '[]',
                isfinished: 0,
                perkiraankeberangkatan: null,
                durasiselesaiPersiapan: null,
                durasiberlayar: null,
                statuskerja: 'persiapan'
            };

            for (const [field, defaultValue] of Object.entries(requiredFields)) {
                if (record[field] === null || record[field] === undefined) {
                    fixedData[field] = defaultValue;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                console.log(`🔧 Updating record ID ${record.id}...`);

                const updateQuery = `
                    UPDATE kapal_masuk_schema.kapal_masuk SET
                        nama = $1, namapemilik = $2, tandaselar = $3, tandapengenal = $4,
                        beratkotor = $5, beratbersih = $6, merekmesin = $7, nomorserimesin = $8,
                        jenisalattangkap = $9, tanggalinput = $10, tanggalkeberangkatan = $11,
                        totalharipersiapan = $12, tanggalberangkat = $13, tanggalkembali = $14,
                        listpersiapan = $15, isfinished = $16, perkiraankeberangkatan = $17,
                        durasiselesaiPersiapan = $18, durasiberlayar = $19, statuskerja = $20
                    WHERE id = $21
                `;

                const updateValues = [
                    fixedData.nama, fixedData.namapemilik, fixedData.tandaselar, fixedData.tandapengenal,
                    fixedData.beratkotor, fixedData.beratbersih, fixedData.merekmesin, fixedData.nomorserimesin,
                    fixedData.jenisalattangkap, fixedData.tanggalinput, fixedData.tanggalkeberangkatan,
                    fixedData.totalharipersiapan, fixedData.tanggalberangkat, fixedData.tanggalkembali,
                    fixedData.listpersiapan, fixedData.isfinished, fixedData.perkiraankeberangkatan,
                    fixedData.durasiselesaiPersiapan, fixedData.durasiberlayar, fixedData.statuskerja,
                    record.id
                ];

                await pool.query(updateQuery, updateValues);
                console.log(`✅ Record ID ${record.id} updated successfully`);
            } else {
                console.log(`✅ Record ID ${record.id} is already clean`);
            }
        }

        console.log('\n🎉 Data fix process completed!');

        // Verify the fix by retrieving data again
        console.log('\n🔍 Verifying fixes...');
        const verifyResult = await pool.query('SELECT * FROM kapal_masuk_schema.kapal_masuk ORDER BY id');
        console.log('📤 Fixed data sample:', JSON.stringify(verifyResult.rows.slice(0, 2), null, 2));

    } catch (error) {
        console.error('❌ Error during data fix:', error);
    } finally {
        await pool.end();
    }
}

fixKapalMasukData();
