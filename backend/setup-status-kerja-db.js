// Setup script for Status Kerja Kapal new database schema
// Run: node setup-status-kerja-db.js

require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL if set (Railway), or use hardcoded local postgres URL for development
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/railway';

console.log('🔌 Using DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function setupStatusKerjaSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up status_kerja_schema...\n');

    // Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS status_kerja_schema`);
    console.log('✅ Created schema: status_kerja_schema');

    // Create main table: status_kerja_kapal
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_kerja_schema.status_kerja_kapal (
        id SERIAL PRIMARY KEY,
        "kapalId" INTEGER,
        nama TEXT NOT NULL DEFAULT '',
        "namaPemilik" TEXT DEFAULT '',
        "tandaSelar" TEXT DEFAULT '',
        "tandaPengenal" TEXT DEFAULT '',
        "beratKotor" TEXT DEFAULT '',
        "beratBersih" TEXT DEFAULT '',
        "merekMesin" TEXT DEFAULT '',
        "nomorSeriMesin" TEXT DEFAULT '',
        "jenisAlatTangkap" TEXT DEFAULT '',
        "statusKerja" TEXT DEFAULT 'persiapan',
        "listPersiapan" TEXT DEFAULT '[]',
        "checklistStates" TEXT DEFAULT '{}',
        "checklistDates" TEXT DEFAULT '{}',
        "finishedChecklistStates" TEXT DEFAULT '{}',
        "tanggalInput" TEXT DEFAULT '',
        "tanggalKeberangkatan" TEXT DEFAULT '',
        "tanggalBerangkat" TEXT DEFAULT '',
        "tanggalKembali" TEXT DEFAULT '',
        "isFinished" BOOLEAN DEFAULT false,
        "isManualInput" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created table: status_kerja_schema.status_kerja_kapal');

    // Create history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_kerja_schema.status_kerja_history (
        id SERIAL PRIMARY KEY,
        "statusKerjaId" INTEGER,
        "kapalId" INTEGER,
        nama TEXT NOT NULL DEFAULT '',
        "statusKerja" TEXT DEFAULT 'menepi',
        "listPersiapan" TEXT DEFAULT '[]',
        "checklistStates" TEXT DEFAULT '{}',
        "checklistDates" TEXT DEFAULT '{}',
        "tanggalKeberangkatan" TEXT DEFAULT '',
        "tanggalBerangkat" TEXT DEFAULT '',
        "tanggalKembali" TEXT DEFAULT '',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created table: status_kerja_schema.status_kerja_history');

    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'status_kerja_schema'
    `);
    console.log('\n📊 Tables in status_kerja_schema:');
    tablesResult.rows.forEach(row => {
      console.log('  - ' + row.table_name);
    });

    console.log('\n✅ Status Kerja Schema setup complete!');
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupStatusKerjaSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
