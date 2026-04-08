const { Pool } = require('pg');

const kapalMasukPool = new Pool({
    connectionString: process.env.DATABASE_URL_KAPAL_MASUK,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateManualInput() {
    console.log('🔧 Migrating kapal_masuk records to isManualInput=true...');
    
    try {
        // Count records before migration
        const beforeCount = await kapalMasukPool.query(`
            SELECT COUNT(*) as count FROM kapal_masuk_schema.kapal_masuk 
            WHERE "isManualInput" IS NULL OR "isManualInput" = false
        `);
        console.log(`📊 Records to migrate: ${beforeCount.rows[0].count}`);
        
        // Update all records
        const result = await kapalMasukPool.query(`
            UPDATE kapal_masuk_schema.kapal_masuk 
            SET "isManualInput" = true 
            WHERE "isManualInput" IS NULL OR "isManualInput" = false
        `);
        
        console.log(`✅ Migrated ${result.rowCount} records to isManualInput=true`);
        
        // Verify
        const afterCount = await kapalMasukPool.query(`
            SELECT COUNT(*) as manual_count FROM kapal_masuk_schema.kapal_masuk WHERE "isManualInput" = true
        `);
        console.log(`✅ Total manual records now: ${afterCount.rows[0].manual_count}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await kapalMasukPool.end();
    }
}

migrateManualInput();

