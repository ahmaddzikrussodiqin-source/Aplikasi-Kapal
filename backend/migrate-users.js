const { Pool } = require('pg');

async function migrateUsersTable() {
    console.log('🔄 Starting users table migration...');

    // Use the users database pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL_USERS,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        allowExitOnIdle: true
    });

    try {
        // Connect to database
        await pool.connect();
        console.log('✅ Connected to users database');

        // Check if role column exists
        console.log('🔍 Checking if role column exists...');
        const columnCheck = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'role'
        `);

        if (columnCheck.rows.length === 0) {
            console.log('❌ Role column does not exist, adding it...');

            // Add role column with default value
            await pool.query(`
                ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Member'
            `);

            console.log('✅ Role column added successfully');

            // Update existing users to have 'Moderator' role (since they were created before role existed)
            const updateResult = await pool.query(`
                UPDATE users SET role = 'Moderator' WHERE role IS NULL OR role = ''
            `);

            console.log(`✅ Updated ${updateResult.rowCount} existing users to Moderator role`);

        } else {
            console.log('✅ Role column already exists');
        }

        // Verify the migration
        console.log('🔍 Verifying migration...');
        const verifyResult = await pool.query(`
            SELECT userId, nama, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('✅ Migration verification - Sample users:');
        verifyResult.rows.forEach(user => {
            console.log(`  - ${user.userid}: ${user.nama} (${user.role})`);
        });

        console.log('🎉 Users table migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateUsersTable()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = migrateUsersTable;
