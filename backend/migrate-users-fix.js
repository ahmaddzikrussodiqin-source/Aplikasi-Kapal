const { Pool } = require('pg');

async function fixUsersTable() {
    console.log('🔄 Starting users table fix...');

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

        // Check current table structure
        console.log('🔍 Checking current users table structure...');
        const tableInfo = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        console.log('📋 Current columns:');
        tableInfo.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // Check if role column exists
        const roleColumn = tableInfo.rows.find(col => col.column_name === 'role');

        if (!roleColumn) {
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

        // Verify the fix
        console.log('🔍 Verifying fix...');
        const verifyResult = await pool.query(`
            SELECT userId, nama, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('✅ Fixed users table - Sample users:');
        verifyResult.rows.forEach(user => {
            console.log(`  - ${user.userid}: ${user.nama} (${user.role})`);
        });

        // Test insert to make sure it works
        console.log('🧪 Testing user insertion...');
        try {
            const testInsert = await pool.query(`
                INSERT INTO users (userId, password, role)
                VALUES ('test_user_fix', 'hashed_password', 'Member')
            `);
            console.log('✅ Test insert successful');

            // Clean up test user
            await pool.query(`DELETE FROM users WHERE userId = 'test_user_fix'`);
            console.log('🧹 Cleaned up test user');
        } catch (insertError) {
            console.error('❌ Test insert failed:', insertError.message);
            throw insertError;
        }

        console.log('🎉 Users table fix completed successfully!');

    } catch (error) {
        console.error('❌ Fix failed:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run fix if called directly
if (require.main === module) {
    fixUsersTable()
        .then(() => {
            console.log('Fix script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fix script failed:', error);
            process.exit(1);
        });
}

module.exports = fixUsersTable;
