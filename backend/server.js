const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database setup - Multiple schemas in one PostgreSQL instance
console.log('🔧 Setting up database connections...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('USERS_DATABASE_URL exists:', !!process.env.USERS_DATABASE_URL);
console.log('KAPAL_DATABASE_URL exists:', !!process.env.KAPAL_DATABASE_URL);

const usersPool = new Pool({
    connectionString: process.env.USERS_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const kapalPool = new Pool({
    connectionString: process.env.KAPAL_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const dokumenPool = new Pool({
    connectionString: process.env.DOKUMEN_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const kapalMasukPool = new Pool({
    connectionString: process.env.KAPAL_MASUK_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('✅ Database pools created');

// Initialize database schemas and tables
async function initializeDatabase() {
    try {
        console.log('🔄 Initializing database schemas and tables...');

        // Create schemas if they don't exist
        console.log('📝 Creating schemas...');
        await usersPool.query(`CREATE SCHEMA IF NOT EXISTS users_schema`);
        await kapalPool.query(`CREATE SCHEMA IF NOT EXISTS kapal_schema`);
        await dokumenPool.query(`CREATE SCHEMA IF NOT EXISTS dokumen_schema`);
        await kapalMasukPool.query(`CREATE SCHEMA IF NOT EXISTS kapal_masuk_schema`);
        console.log('✅ Schemas created successfully');

        // Users table in users_schema
        console.log('📝 Creating users table...');
        await usersPool.query(`
            CREATE TABLE IF NOT EXISTS users_schema.users (
                userId TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                nama TEXT,
                role TEXT DEFAULT 'Member',
                photoUri TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created successfully');

        // Kapal table in kapal_schema
        await kapalPool.query(`
            CREATE TABLE IF NOT EXISTS kapal_schema.kapal (
                id SERIAL PRIMARY KEY,
                nama TEXT,
                namaPemilik TEXT NOT NULL DEFAULT '',
                tandaSelar TEXT NOT NULL DEFAULT '',
                tandaPengenal TEXT NOT NULL DEFAULT '',
                beratKotor TEXT NOT NULL DEFAULT '',
                beratBersih TEXT NOT NULL DEFAULT '',
                merekMesin TEXT NOT NULL DEFAULT '',
                nomorSeriMesin TEXT NOT NULL DEFAULT '',
                jenisAlatTangkap TEXT NOT NULL DEFAULT '',
                tanggalInput TEXT,
                tanggalKeberangkatan TEXT,
                totalHariPersiapan INTEGER,
                tanggalBerangkat TEXT,
                tanggalKembali TEXT,
                listPersiapan TEXT NOT NULL DEFAULT '[]',
                listDokumen TEXT NOT NULL DEFAULT '[]',
                isFinished INTEGER NOT NULL DEFAULT 0,
                perkiraanKeberangkatan TEXT,
                durasiSelesaiPersiapan TEXT
            )
        `);

        // Dokumen table in dokumen_schema
        await dokumenPool.query(`
            CREATE TABLE IF NOT EXISTS dokumen_schema.dokumen (
                id SERIAL PRIMARY KEY,
                kapalId INTEGER NOT NULL,
                nama TEXT NOT NULL,
                jenis TEXT NOT NULL,
                nomor TEXT,
                tanggalTerbit TEXT,
                tanggalKadaluarsa TEXT,
                status TEXT NOT NULL DEFAULT 'aktif',
                filePath TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Kapal Masuk table in kapal_masuk_schema
        await kapalMasukPool.query(`
            CREATE TABLE IF NOT EXISTS kapal_masuk_schema.kapal_masuk (
                id SERIAL PRIMARY KEY,
                nama TEXT,
                namaPemilik TEXT NOT NULL DEFAULT '',
                tandaSelar TEXT NOT NULL DEFAULT '',
                tandaPengenal TEXT NOT NULL DEFAULT '',
                beratKotor TEXT NOT NULL DEFAULT '',
                beratBersih TEXT NOT NULL DEFAULT '',
                merekMesin TEXT NOT NULL DEFAULT '',
                nomorSeriMesin TEXT NOT NULL DEFAULT '',
                jenisAlatTangkap TEXT NOT NULL DEFAULT '',
                tanggalInput TEXT,
                tanggalKeberangkatan TEXT,
                totalHariPersiapan INTEGER,
                tanggalBerangkat TEXT,
                tanggalKembali TEXT,
                listPersiapan TEXT NOT NULL DEFAULT '[]',
                isFinished INTEGER NOT NULL DEFAULT 0,
                perkiraanKeberangkatan TEXT,
                durasiSelesaiPersiapan TEXT,
                statusKerja TEXT NOT NULL DEFAULT 'persiapan'
            )
        `);

        console.log('Database schemas and tables initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Connect to databases and initialize
Promise.all([
    usersPool.connect(),
    kapalPool.connect(),
    dokumenPool.connect(),
    kapalMasukPool.connect()
]).then(() => {
    console.log('Connected to all PostgreSQL databases.');
    initializeDatabase();
}).catch(err => {
    console.error('Error connecting to databases:', err);
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// API Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'KapalList Backend API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to check database (temporary)
app.get('/debug/database', async (req, res) => {
    try {
        console.log('🔍 Debug: Checking database contents...');

        // Check schemas
        const schemasResult = await usersPool.query('SELECT schema_name FROM information_schema.schemata ORDER BY schema_name');
        console.log('Schemas found:', schemasResult.rows);

        // Check users_schema specifically
        const usersSchemaResult = await usersPool.query('SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1', ['users_schema']);
        console.log('users_schema exists:', usersSchemaResult.rows.length > 0);

        let usersData = [];
        let usersTableExists = false;

        if (usersSchemaResult.rows.length > 0) {
            // Check if users table exists
            const tablesResult = await usersPool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2', ['users_schema', 'users']);
            usersTableExists = tablesResult.rows.length > 0;
            console.log('users table exists:', usersTableExists);

            if (usersTableExists) {
                // Get users data
                const usersResult = await usersPool.query('SELECT userId, nama, role, created_at FROM users_schema.users ORDER BY created_at DESC');
                usersData = usersResult.rows;
                console.log('Users in database:', usersData.length);
            }
        }

        res.json({
            success: true,
            message: 'Database debug info',
            data: {
                schemas: schemasResult.rows,
                usersSchemaExists: usersSchemaResult.rows.length > 0,
                usersTableExists: usersTableExists,
                usersCount: usersData.length,
                users: usersData,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Debug database error:', error);
        res.status(500).json({
            success: false,
            message: 'Database debug error',
            error: error.message
        });
    }
});

// Authentication routes
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        const result = await usersPool.query('SELECT * FROM users_schema.users WHERE userId = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { userId: user.userid, nama: user.nama },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    userId: user.userid,
                    nama: user.nama,
                    role: user.role,
                    photoUri: user.photouri
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { userId, password } = req.body;
        console.log('📝 Register attempt for userId:', userId);

        if (!userId || !password) {
            console.log('❌ Register failed: Missing userId or password');
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const existingResult = await usersPool.query('SELECT userId FROM users_schema.users WHERE userId = $1', [userId]);
        console.log('Existing users found:', existingResult.rows.length);

        if (existingResult.rows.length > 0) {
            console.log('❌ Register failed: User already exists');
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        console.log('💾 Inserting new user into database...');
        const insertResult = await usersPool.query(
            'INSERT INTO users_schema.users (userId, password) VALUES ($1, $2)',
            [userId, hashedPassword]
        );
        console.log('✅ User inserted successfully, rowCount:', insertResult.rowCount);

        console.log('🎉 Register successful for userId:', userId);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                userId: userId
            }
        });
    } catch (error) {
        console.error('❌ Register error:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// User routes (protected)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await usersPool.query('SELECT userId, nama, role, photoUri, created_at FROM users_schema.users');
        const users = result.rows.map(row => ({
            userId: row.userid,
            nama: row.nama,
            role: row.role,
            photoUri: row.photouri,
            created_at: row.created_at
        }));
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.put('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { password, nama, role, photoUri } = req.body;

        let query = 'UPDATE users_schema.users SET nama = $1, role = $2, photoUri = $3';
        let params = [nama, role, photoUri];

        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = $4';
            params.push(hashedPassword);
        }

        query += ' WHERE userId = $' + (params.length + 1);
        params.push(userId);

        const result = await usersPool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await usersPool.query('DELETE FROM users_schema.users WHERE userId = $1', [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { userId, password, nama, role } = req.body;
        console.log('📝 Create user attempt for userId:', userId);

        if (!userId || !password) {
            console.log('❌ Create user failed: Missing userId or password');
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const existingResult = await usersPool.query('SELECT userId FROM users_schema.users WHERE userId = $1', [userId]);
        console.log('Existing users found:', existingResult.rows.length);

        if (existingResult.rows.length > 0) {
            console.log('❌ Create user failed: User already exists');
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        console.log('💾 Inserting new user into database...');
        const insertResult = await usersPool.query(
            'INSERT INTO users_schema.users (userId, password, nama, role) VALUES ($1, $2, $3, $4)',
            [userId, hashedPassword, nama, role]
        );
        console.log('✅ User inserted successfully, rowCount:', insertResult.rowCount);

        console.log('🎉 Create user successful for userId:', userId);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                userId: userId,
                nama: nama,
                email: email
            }
        });
    } catch (error) {
        console.error('❌ Create user error:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Helper function to safely parse listPersiapan
function parseListPersiapan(value) {
    if (!value) return [];

    // If it's already an array, return it
    if (Array.isArray(value)) return value;

    // If it's '[]' or 'null', return empty array
    if (value === '[]' || value === 'null') return [];

    // Try to parse as JSON
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') {
            return parsed.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0);
        }
        return [];
    } catch (e) {
        // If JSON.parse fails, try to parse as string
        if (typeof value === 'string') {
            // If it looks like JSON array, try to parse it
            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    return JSON.parse(value);
                } catch (e2) {
                    return [];
                }
            }
            // Otherwise, split by comma/newline
            return value.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0);
        }
        return [];
    }
}

// Kapal routes (protected)
app.get('/api/kapal', authenticateToken, async (req, res) => {
    try {
        const result = await kapalPool.query('SELECT * FROM kapal_schema.kapal ORDER BY id DESC');
        const kapal = result.rows;

        // Parse JSON strings back to arrays and convert isFinished to boolean
        const parsedKapal = kapal.map(k => ({
            ...k,
            listPersiapan: parseListPersiapan(k.listpersiapan),
            listDokumen: JSON.parse(k.listdokumen || '[]'),
            isFinished: Boolean(k.isfinished)
        }));

        res.json({
            success: true,
            message: 'Kapal retrieved successfully',
            data: parsedKapal
        });
    } catch (error) {
        console.error('Get kapal error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.get('/api/kapal/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await kapalPool.query('SELECT * FROM kapal_schema.kapal WHERE id = $1', [id]);
        const kapal = result.rows[0];

        if (!kapal) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        // Parse JSON strings back to arrays
        const parsedKapal = {
            ...kapal,
            listPersiapan: parseListPersiapan(kapal.listpersiapan),
            listDokumen: JSON.parse(kapal.listdokumen || '[]'),
            isFinished: Boolean(kapal.isfinished)
        };

        res.json({
            success: true,
            message: 'Kapal retrieved successfully',
            data: parsedKapal
        });
    } catch (error) {
        console.error('Get kapal by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.post('/api/kapal', authenticateToken, async (req, res) => {
    try {
        const kapalData = req.body;

        const result = await kapalPool.query(`
            INSERT INTO kapal_schema.kapal (
                nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
                merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput, tanggalKeberangkatan,
                totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan, listDokumen,
                isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
            kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
            kapalData.jenisAlatTangkap, kapalData.tanggalInput, kapalData.tanggalKeberangkatan,
            kapalData.totalHariPersiapan, kapalData.tanggalBerangkat, kapalData.tanggalKembali,
            JSON.stringify(kapalData.listPersiapan || []), JSON.stringify(kapalData.listDokumen || []),
            kapalData.isFinished ? 1 : 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan
        ]);

        const kapal = result.rows[0];

        // Parse JSON strings back to arrays
        const parsedKapal = {
            ...kapal,
            listPersiapan: parseListPersiapan(kapal.listpersiapan),
            listDokumen: JSON.parse(kapal.listdokumen || '[]'),
            isFinished: Boolean(kapal.isfinished)
        };

        res.status(201).json({
            success: true,
            message: 'Kapal created successfully',
            data: parsedKapal
        });
    } catch (error) {
        console.error('Create kapal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create kapal'
        });
    }
});

app.put('/api/kapal/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const kapalData = req.body;

        const result = await kapalPool.query(`
            UPDATE kapal_schema.kapal SET
                nama = $1, namaPemilik = $2, tandaSelar = $3, tandaPengenal = $4,
                beratKotor = $5, beratBersih = $6, merekMesin = $7, nomorSeriMesin = $8,
                jenisAlatTangkap = $9, tanggalInput = $10, tanggalKeberangkatan = $11,
                totalHariPersiapan = $12, tanggalBerangkat = $13, tanggalKembali = $14,
                listPersiapan = $15, listDokumen = $16, isFinished = $17,
                perkiraanKeberangkatan = $18, durasiSelesaiPersiapan = $19
            WHERE id = $20
        `, [
            kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
            kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
            kapalData.jenisAlatTangkap, kapalData.tanggalInput, kapalData.tanggalKeberangkatan,
            kapalData.totalHariPersiapan, kapalData.tanggalBerangkat, kapalData.tanggalKembali,
            JSON.stringify(kapalData.listPersiapan || []), JSON.stringify(kapalData.listDokumen || []),
            kapalData.isFinished ? 1 : 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan,
            id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal updated successfully'
        });
    } catch (error) {
        console.error('Update kapal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update kapal'
        });
    }
});

app.delete('/api/kapal/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await kapalPool.query('DELETE FROM kapal_schema.kapal WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal deleted successfully'
        });
    } catch (error) {
        console.error('Delete kapal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete kapal'
        });
    }
});

// Dokumen routes (protected)
app.get('/api/dokumen', authenticateToken, async (req, res) => {
    try {
        const result = await dokumenPool.query('SELECT * FROM dokumen_schema.dokumen ORDER BY id DESC');
        res.json({
            success: true,
            message: 'Dokumen retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get dokumen error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.get('/api/dokumen/kapal/:kapalId', authenticateToken, async (req, res) => {
    try {
        const { kapalId } = req.params;
        const result = await dokumenPool.query('SELECT * FROM dokumen_schema.dokumen WHERE kapalId = $1 ORDER BY id DESC', [kapalId]);
        res.json({
            success: true,
            message: 'Dokumen retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get dokumen by kapalId error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.get('/api/dokumen/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dokumenPool.query('SELECT * FROM dokumen_schema.dokumen WHERE id = $1', [id]);
        const dokumen = result.rows[0];

        if (!dokumen) {
            return res.status(404).json({
                success: false,
                message: 'Dokumen not found'
            });
        }

        res.json({
            success: true,
            message: 'Dokumen retrieved successfully',
            data: dokumen
        });
    } catch (error) {
        console.error('Get dokumen by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.post('/api/dokumen', authenticateToken, async (req, res) => {
    try {
        const dokumenData = req.body;
        const result = await dokumenPool.query(`
            INSERT INTO dokumen_schema.dokumen (
                kapalId, nama, jenis, nomor, tanggalTerbit, tanggalKadaluarsa, status, filePath
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            dokumenData.kapalId, dokumenData.nama, dokumenData.jenis, dokumenData.nomor,
            dokumenData.tanggalTerbit, dokumenData.tanggalKadaluarsa, dokumenData.status || 'aktif',
            dokumenData.filePath
        ]);

        res.status(201).json({
            success: true,
            message: 'Dokumen created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create dokumen error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create dokumen'
        });
    }
});

app.put('/api/dokumen/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const dokumenData = req.body;

        const result = await dokumenPool.query(`
            UPDATE dokumen_schema.dokumen SET
                kapalId = $1, nama = $2, jenis = $3, nomor = $4,
                tanggalTerbit = $5, tanggalKadaluarsa = $6, status = $7, filePath = $8
            WHERE id = $9
        `, [
            dokumenData.kapalId, dokumenData.nama, dokumenData.jenis, dokumenData.nomor,
            dokumenData.tanggalTerbit, dokumenData.tanggalKadaluarsa, dokumenData.status,
            dokumenData.filePath, id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Dokumen not found'
            });
        }

        res.json({
            success: true,
            message: 'Dokumen updated successfully'
        });
    } catch (error) {
        console.error('Update dokumen error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update dokumen'
        });
    }
});

app.delete('/api/dokumen/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dokumenPool.query('DELETE FROM dokumen_schema.dokumen WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Dokumen not found'
            });
        }

        res.json({
            success: true,
            message: 'Dokumen deleted successfully'
        });
    } catch (error) {
        console.error('Delete dokumen error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete dokumen'
        });
    }
});

// Kapal Masuk routes (protected)
app.get('/api/kapal-masuk', authenticateToken, async (req, res) => {
    try {
        const result = await kapalMasukPool.query('SELECT * FROM kapal_masuk_schema.kapal_masuk ORDER BY id DESC');
        const kapalMasuk = result.rows;

        // Parse JSON strings back to arrays and convert isFinished to boolean
        const parsedKapalMasuk = kapalMasuk.map(k => ({
            ...k,
            listPersiapan: parseListPersiapan(k.listpersiapan),
            isFinished: Boolean(k.isfinished)
        }));

        res.json({
            success: true,
            message: 'Kapal Masuk retrieved successfully',
            data: parsedKapalMasuk
        });
    } catch (error) {
        console.error('Get kapal masuk error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.get('/api/kapal-masuk/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await kapalMasukPool.query('SELECT * FROM kapal_masuk_schema.kapal_masuk WHERE id = $1', [id]);
        const kapalMasuk = result.rows[0];

        if (!kapalMasuk) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Masuk not found'
            });
        }

        // Parse JSON strings back to arrays
        const parsedKapalMasuk = {
            ...kapalMasuk,
            listPersiapan: parseListPersiapan(kapalMasuk.listpersiapan),
            isFinished: Boolean(kapalMasuk.isfinished)
        };

        res.json({
            success: true,
            message: 'Kapal Masuk retrieved successfully',
            data: parsedKapalMasuk
        });
    } catch (error) {
        console.error('Get kapal masuk by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.post('/api/kapal-masuk', authenticateToken, async (req, res) => {
    try {
        const kapalMasukData = req.body;
        const result = await kapalMasukPool.query(`
            INSERT INTO kapal_masuk_schema.kapal_masuk (
                nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
                merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput, tanggalKeberangkatan,
                totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan,
                isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan, statusKerja
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            kapalMasukData.nama, kapalMasukData.namaPemilik, kapalMasukData.tandaSelar, kapalMasukData.tandaPengenal,
            kapalMasukData.beratKotor, kapalMasukData.beratBersih, kapalMasukData.merekMesin, kapalMasukData.nomorSeriMesin,
            kapalMasukData.jenisAlatTangkap, kapalMasukData.tanggalInput, kapalMasukData.tanggalKeberangkatan,
            kapalMasukData.totalHariPersiapan, kapalMasukData.tanggalBerangkat, kapalMasukData.tanggalKembali,
            JSON.stringify(kapalMasukData.listPersiapan || []), kapalMasukData.isFinished ? 1 : 0,
            kapalMasukData.perkiraanKeberangkatan, kapalMasukData.durasiSelesaiPersiapan,
            kapalMasukData.statusKerja || 'persiapan'
        ]);

        const kapalMasuk = result.rows[0];

        // Parse JSON strings back to arrays
        const parsedKapalMasuk = {
            ...kapalMasuk,
            listPersiapan: parseListPersiapan(kapalMasuk.listpersiapan),
            isFinished: Boolean(kapalMasuk.isfinished)
        };

        res.status(201).json({
            success: true,
            message: 'Kapal Masuk created successfully',
            data: parsedKapalMasuk
        });
    } catch (error) {
        console.error('Create kapal masuk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create kapal masuk'
        });
    }
});

app.put('/api/kapal-masuk/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const kapalMasukData = req.body;

        const result = await kapalMasukPool.query(`
            UPDATE kapal_masuk_schema.kapal_masuk SET
                nama = $1, namaPemilik = $2, tandaSelar = $3, tandaPengenal = $4,
                beratKotor = $5, beratBersih = $6, merekMesin = $7, nomorSeriMesin = $8,
                jenisAlatTangkap = $9, tanggalInput = $10, tanggalKeberangkatan = $11,
                totalHariPersiapan = $12, tanggalBerangkat = $13, tanggalKembali = $14,
                listPersiapan = $15, isFinished = $16, perkiraanKeberangkatan = $17,
                durasiSelesaiPersiapan = $18, statusKerja = $19
            WHERE id = $20
        `, [
            kapalMasukData.nama, kapalMasukData.namaPemilik, kapalMasukData.tandaSelar, kapalMasukData.tandaPengenal,
            kapalMasukData.beratKotor, kapalMasukData.beratBersih, kapalMasukData.merekMesin, kapalMasukData.nomorSeriMesin,
            kapalMasukData.jenisAlatTangkap, kapalMasukData.tanggalInput, kapalMasukData.tanggalKeberangkatan,
            kapalMasukData.totalHariPersiapan, kapalMasukData.tanggalBerangkat, kapalMasukData.tanggalKembali,
            JSON.stringify(kapalMasukData.listPersiapan || []), kapalMasukData.isFinished ? 1 : 0,
            kapalMasukData.perkiraanKeberangkatan, kapalMasukData.durasiSelesaiPersiapan,
            kapalMasukData.statusKerja, id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Masuk not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal Masuk updated successfully'
        });
    } catch (error) {
        console.error('Update kapal masuk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update kapal masuk'
        });
    }
});

app.delete('/api/kapal-masuk/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await kapalMasukPool.query('DELETE FROM kapal_masuk_schema.kapal_masuk WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Masuk not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal Masuk deleted successfully'
        });
    } catch (error) {
        console.error('Delete kapal masuk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete kapal masuk'
        });
    }
});

// File upload route (protected)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 KapalList Backend server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    Promise.all([
        usersPool.end(),
        kapalPool.end(),
        dokumenPool.end(),
        kapalMasukPool.end()
    ]).then(() => {
        console.log('All database connections closed.');
        process.exit(0);
    }).catch(err => {
        console.error('Error closing database connections:', err);
        process.exit(1);
    });
});

module.exports = app;
