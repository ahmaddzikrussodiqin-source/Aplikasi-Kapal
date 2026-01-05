#!/usr/bin/env node

/**
 * Test script for Railway Dokumen Database
 * Tests document creation, retrieval, and file path storage
 */

const { Pool } = require('pg');

console.log('🧪 Testing Railway Dokumen Database');
console.log('====================================\n');

// Check if DATABASE_URL_DOKUMEN is provided
const dokumenDbUrl = process.env.DATABASE_URL_DOKUMEN;

if (!dokumenDbUrl) {
    console.log('❌ DATABASE_URL_DOKUMEN environment variable is not set!');
    console.log('Please set it to your Railway PostgreSQL database URL');
    process.exit(1);
}

console.log('✅ DATABASE_URL_DOKUMEN found');

// Create connection pool
const dokumenPool = new Pool({
    connectionString: dokumenDbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    allowExitOnIdle: true
});

async function testDokumenDatabase() {
    try {
        console.log('🔄 Connecting to dokumen database...');
        await dokumenPool.connect();
        console.log('✅ Connected successfully');

        // Test 1: Check table exists
        console.log('\n1. Testing table existence...');
        const tableCheck = await dokumenPool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'dokumen'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Dokumen table exists');
        } else {
            console.log('❌ Dokumen table does not exist');
            return;
        }

        // Test 2: Insert test document with file paths
        console.log('\n2. Testing document insertion with file paths...');

        const testFilePath = JSON.stringify({
            images: [
                "https://your-server.com/uploads/image1.jpg",
                "https://your-server.com/uploads/image2.png"
            ],
            pdfs: [
                "https://your-server.com/uploads/document1.pdf",
                "https://your-server.com/uploads/document2.pdf"
            ]
        });

        const insertResult = await dokumenPool.query(`
            INSERT INTO dokumen (
                kapalId, nama, jenis, tanggalKadaluarsa, status, filePath
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [1, 'Test Document', 'Surat Izin', '2025-12-31', 'aktif', testFilePath]);

        console.log('✅ Test document inserted:', insertResult.rows[0].id);

        // Test 3: Retrieve document and parse file paths
        console.log('\n3. Testing document retrieval and file path parsing...');
        const selectResult = await dokumenPool.query(
            'SELECT * FROM dokumen WHERE id = $1',
            [insertResult.rows[0].id]
        );

        const doc = selectResult.rows[0];
        console.log('✅ Document retrieved:', {
            id: doc.id,
            nama: doc.nama,
            jenis: doc.jenis,
            status: doc.status
        });

        // Parse file paths
        try {
            const fileData = JSON.parse(doc.filepath);
            console.log('✅ File paths parsed successfully:');
            console.log('   Images:', fileData.images?.length || 0);
            console.log('   PDFs:', fileData.pdfs?.length || 0);
        } catch (parseError) {
            console.log('❌ Failed to parse file paths:', parseError.message);
        }

        // Test 4: Update document
        console.log('\n4. Testing document update...');
        const updatedFilePath = JSON.stringify({
            images: [
                "https://your-server.com/uploads/image1.jpg",
                "https://your-server.com/uploads/image2.png",
                "https://your-server.com/uploads/image3.jpg"
            ],
            pdfs: [
                "https://your-server.com/uploads/document1.pdf"
            ]
        });

        await dokumenPool.query(`
            UPDATE dokumen
            SET filePath = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [updatedFilePath, doc.id]);

        console.log('✅ Document updated successfully');

        // Test 5: Query documents by kapalId
        console.log('\n5. Testing query by kapalId...');
        const kapalDocs = await dokumenPool.query(
            'SELECT id, nama, jenis FROM dokumen WHERE kapalId = $1 ORDER BY id DESC',
            [1]
        );

        console.log(`✅ Found ${kapalDocs.rows.length} documents for kapalId 1`);

        // Test 6: Clean up test data
        console.log('\n6. Cleaning up test data...');
        await dokumenPool.query('DELETE FROM dokumen WHERE nama = $1', ['Test Document']);
        console.log('✅ Test data cleaned up');

        // Test 7: Performance check
        console.log('\n7. Testing database performance...');
        const startTime = Date.now();

        // Insert multiple test records
        const testInserts = [];
        for (let i = 0; i < 10; i++) {
            testInserts.push(
                dokumenPool.query(`
                    INSERT INTO dokumen (kapalId, nama, jenis, status, filePath)
                    VALUES ($1, $2, $3, $4, $5)
                `, [2, `Performance Test ${i}`, 'Test', 'aktif', testFilePath])
            );
        }

        await Promise.all(testInserts);

        // Query them back
        const perfResult = await dokumenPool.query(
            'SELECT COUNT(*) as count FROM dokumen WHERE kapalId = $1',
            [2]
        );

        const endTime = Date.now();
        console.log(`✅ Performance test: ${perfResult.rows[0].count} records in ${endTime - startTime}ms`);

        // Clean up performance test data
        await dokumenPool.query('DELETE FROM dokumen WHERE kapalId = $1', [2]);
        console.log('✅ Performance test data cleaned up');

        console.log('\n🎉 All dokumen database tests passed!');
        console.log('\n📋 Test Summary:');
        console.log('- ✅ Table existence verified');
        console.log('- ✅ Document insertion with file paths');
        console.log('- ✅ Document retrieval and JSON parsing');
        console.log('- ✅ Document updates');
        console.log('- ✅ Query by kapalId');
        console.log('- ✅ Data cleanup');
        console.log('- ✅ Performance testing');

        console.log('\n🚀 Dokumen database is ready for production use!');
        console.log('You can now store and retrieve images and PDFs via the filePath JSON field.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await dokumenPool.end();
    }
}

// Run tests
testDokumenDatabase();
