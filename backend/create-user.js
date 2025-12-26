const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'kapallist.db');
const db = new sqlite3.Database(dbPath);

async function createUser() {
    const userId = 'Suhanda';
    const password = 'TampanMaxBrukz';

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        db.run(
            'INSERT OR REPLACE INTO users (userId, password, nama) VALUES (?, ?, ?)',
            [userId, hashedPassword, userId],
            function(err) {
                if (err) {
                    console.error('Error creating user:', err);
                } else {
                    console.log('✅ User created successfully!');
                    console.log('UserID:', userId);
                    console.log('Password:', password);
                }
                db.close();
            }
        );
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

createUser();
