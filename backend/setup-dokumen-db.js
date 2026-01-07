#!/usr/bin/env node

/**
 * Setup script for Railway Dokumen Database
 * This script helps set up a separate PostgreSQL database on Railway
 * specifically for storing document data including images and PDFs.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setup Railway Dokumen Database');
console.log('==================================\n');

// Check if DATABASE_URL_DOKUMEN is provided, otherwise use DATABASE_URL_KAPAL
const dokumenDbUrl = process.env.DATABASE_URL_DOKUMEN || process.env.DATABASE_URL_KAPAL;

if (!dokumenDbUrl) {
    console.log('❌ Neither DATABASE_URL_DOKUMEN nor DATABASE_URL_KAPAL environment variable is set!');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to your Railway project dashboard');
    console.log('2. Ensure you have a PostgreSQL database');
    console.log('3. Copy the DATABASE_URL from the database');
    console.log('4. Set the environment variable: DATABASE_URL_KAPAL=<your_database_url>');
    console.log('5. Run this script again');
    process.exit(1);
}

const dbType = process.env.DATABASE_URL_DOKUMEN ? 'dokumen' : 'kapal';
console.log(`✅ Using ${dbType} database for dokumen table`);

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

async function setupDokumenDatabase() {
    try {
        console.log('🔄 Connecting to dokumen database...');

        // Test connection
        await dokumenPool.connect();
        console.log('✅ Connected to dokumen database successfully');

        console.log('📝 Creating dokumen table...');

        // Create dokumen table optimized for storing images and PDFs
        await dokumenPool.query(`
            CREATE TABLE IF NOT EXISTS dokumen (
                id SERIAL PRIMARY KEY,
                kapalId INTEGER NOT NULL,
                nama TEXT NOT NULL,
                jenis TEXT NOT NULL,
                nomor TEXT,
                tanggalTerbit TEXT,
                tanggalKadaluarsa TEXT,
                status TEXT NOT NULL DEFAULT 'aktif',
                filePath TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Dokumen table created successfully');

        // Create indexes for better performance
        console.log('📊 Creating indexes...');

        await dokumenPool.query(`
            CREATE INDEX IF NOT EXISTS idx_dokumen_kapal_id ON dokumen(kapalId)
        `);

        await dokumenPool.query(`
            CREATE INDEX IF NOT EXISTS idx_dokumen_status ON dokumen(status)
        `);

        await dokumenPool.query(`
            CREATE INDEX IF NOT EXISTS idx_dokumen_created_at ON dokumen(created_at)
        `);

        console.log('✅ Indexes created successfully');

        // Test table creation
        console.log('🧪 Testing table creation...');
        const testResult = await dokumenPool.query('SELECT COUNT(*) as count FROM dokumen');
        console.log(`✅ Table test passed. Current records: ${testResult.rows[0].count}`);

        console.log('\n🎉 Dokumen database setup completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Dokumen table created with optimized schema');
        console.log('- Indexes added for performance');
        console.log('- Ready to store images and PDFs via filePath JSON field');

        console.log('\n💡 Next steps:');
        console.log('1. Deploy your backend with DATABASE_URL_DOKUMEN set');
        console.log('2. Test document upload functionality');
        console.log('3. Verify images and PDFs are stored correctly');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await dokumenPool.end();
    }
}

// Run setup
setupDokumenDatabase();
