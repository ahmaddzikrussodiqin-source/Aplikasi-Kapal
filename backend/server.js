const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Database pools for separate databases
console.log('🔧 Setting up separate database pools...');

// Users database pool
const usersPool = new Pool({
    connectionString: process.env.DATABASE_URL_USERS,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    allowExitOnIdle: true
});

// Kapal database pool
const kapalPool = new Pool({
    connectionString: process.env.DATABASE_URL_KAPAL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    allowExitOnIdle: true
});

// Dokumen database pool (optional)
let dokumenPool = null;
if (process.env.DATABASE_URL_DOKUMEN) {
    dokumenPool = new Pool({
        connectionString: process.env.DATABASE_URL_DOKUMEN,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        allowExitOnIdle: true
    });
} else {
    console.log('⚠️  DATABASE_URL_DOKUMEN not set - Dokumen functionality will be disabled');
}

// Kapal Masuk database pool
const kapalMasukPool = new Pool({
    connectionString: process.env.DATABASE_URL_KAPAL_MASUK,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    allowExitOnIdle: true
});

// Ensure dokumen table exists in kapalPool (fallback database)
async function ensureDokumenTable() {
    try {
        await kapalPool.query(`
            CREATE TABLE IF NOT EXISTS dokumen (
                id SERIAL PRIMARY KEY,
                kapalId INTEGER NOT NULL,
                nama TEXT NOT NULL,
                jenis TEXT NOT NULL,
                nomor TEXT,
                tanggalTerbit TEXT,
                tanggalKadaluarsa TEXT,
                status TEXT NOT NULL DEFAULT 'aktif',
                "filePath" TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Rename column if it exists as lowercase
        try {
            await kapalPool.query(`ALTER TABLE dokumen RENAME COLUMN filepath TO "filePath"`);
            console.log('✅ Renamed filepath to filePath');
        } catch (alterError) {
            console.log('Rename column failed or already renamed');
        }

        // Rename tanggalKadaluarsa column if it exists as lowercase
        try {
            await kapalPool.query(`ALTER TABLE dokumen RENAME COLUMN tanggalkadaluarsa TO "tanggalKadaluarsa"`);
            console.log('✅ Renamed tanggalkadaluarsa to "tanggalKadaluarsa"');
        } catch (alterError) {
            console.log('Rename tanggalKadaluarsa column failed or already renamed');
        }

        // Add missing columns if they don't exist (for existing tables)
        try {
            // Check if filePath column exists
            const columnCheck = await kapalPool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'dokumen'
                AND column_name = 'filePath'
            `);

            if (columnCheck.rows.length === 0) {
                console.log('❌ filePath column missing, adding it...');
                await kapalPool.query(`ALTER TABLE dokumen ADD COLUMN "filePath" TEXT`);
                console.log('✅ filePath column added successfully');
            } else {
                console.log('✅ filePath column already exists');
            }
        } catch (alterError) {
            console.log('Error checking/adding filePath column:', alterError.message);
        }

        try {
            await kapalPool.query(`ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ Updated_at column ensured in dokumen table');
        } catch (alterError) {
            console.log('Updated_at column already exists or could not be added');
        }

        console.log('✅ Dokumen table ensured in kapal database');
    } catch (error) {
        console.error('❌ Failed to create dokumen table:', error);
    }
}

ensureDokumenTable();

console.log('✅ All database pools created');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server and attach Socket.io
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now, adjust in production
        methods: ["GET", "POST"]
    }
});

// Socket.io middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.user = user;
        next();
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.user.userId);

    // Join a room for checklist updates
    socket.on('join-checklist', (kapalId) => {
        socket.join(`checklist-${kapalId}`);
        console.log(`User ${socket.user.userId} joined checklist room for kapal ${kapalId}`);
    });

    // Handle checklist update
    socket.on('update-checklist', async (data) => {
        const { kapalId, item, checked, date } = data;
        try {
            // Get current checklist data
            const currentResult = await kapalMasukPool.query(`
                SELECT "checklistStates", "checklistDates" FROM kapal_masuk_schema.kapal_masuk WHERE id = $1
            `, [kapalId]);

            if (currentResult.rows.length === 0) {
                socket.emit('checklist-update-error', { message: 'Kapal not found' });
                return;
            }

            const currentStates = JSON.parse(currentResult.rows[0]["checklistStates"] || '{}');
            const currentDates = JSON.parse(currentResult.rows[0]["checklistDates"] || '{}');

            // Update the specific item
            currentStates[item] = checked;
            if (checked) {
                currentDates[item] = date;
            } else {
                delete currentDates[item];
            }

            // Update database
            await kapalMasukPool.query(`
                UPDATE kapal_masuk_schema.kapal_masuk SET
                    "checklistStates" = $1, "checklistDates" = $2
                WHERE id = $3
            `, [JSON.stringify(currentStates), JSON.stringify(currentDates), kapalId]);

            // Broadcast to all clients in the room
            socket.to(`checklist-${kapalId}`).emit('checklist-updated', {
                kapalId,
                checklistStates: currentStates,
                checklistDates: currentDates
            });

            console.log(`Checklist item '${item}' updated for kapal ${kapalId} by user ${socket.user.userId}`);
        } catch (error) {
            console.error('Error updating checklist:', error);
            socket.emit('checklist-update-error', { message: 'Failed to update checklist' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.userId);
    });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
        // Use original extension to maintain file integrity
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Initialize database tables
async function initializeDatabase() {
    try {
        console.log('🔄 Initializing database tables...');

        // Initialize Users database
        console.log('📝 Creating users table...');
        await usersPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                nama TEXT,
                role TEXT DEFAULT 'Member',
                photoUri TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created successfully');

        // Check and migrate role column if needed
        console.log('🔄 Checking users table migration...');
        try {
            const columnCheck = await usersPool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'users'
                AND column_name = 'role'
            `);

            if (columnCheck.rows.length === 0) {
                console.log('❌ Role column missing, adding it...');
                await usersPool.query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Member'`);
                console.log('✅ Role column added to users table');

                // Update existing users
                const updateResult = await usersPool.query(`
                    UPDATE users SET role = 'Moderator' WHERE role IS NULL OR role = ''
                `);
                console.log(`✅ Updated ${updateResult.rowCount} existing users to Moderator role`);
            } else {
                console.log('✅ Role column already exists in users table');
            }
        } catch (migrationError) {
            console.error('❌ Migration failed:', migrationError);
            throw migrationError; // Fail the deployment if migration fails
        }

        // Initialize Kapal database
        console.log('📝 Creating kapal tables...');
        await kapalPool.query(`
            CREATE TABLE IF NOT EXISTS kapal_info (
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
                listDokumen TEXT NOT NULL DEFAULT '[]'
            )
        `);

        await kapalPool.query(`
            CREATE TABLE IF NOT EXISTS kapal_status (
                id SERIAL PRIMARY KEY,
                kapalId INTEGER UNIQUE,
                tanggalKeberangkatan TEXT,
                totalHariPersiapan INTEGER,
                tanggalBerangkat TEXT,
                tanggalKembali TEXT,
                listPersiapan TEXT NOT NULL DEFAULT '[]',
                isFinished INTEGER NOT NULL DEFAULT 0,
                perkiraanKeberangkatan TEXT,
                durasiSelesaiPersiapan TEXT,
                durasiBerlayar TEXT
            )
        `);

        // Add UNIQUE constraint to kapalId if it doesn't exist
        try {
            await kapalPool.query(`ALTER TABLE kapal_status ADD CONSTRAINT kapal_status_kapalid_unique UNIQUE (kapalId)`);
            console.log('✅ UNIQUE constraint added to kapal_status.kapalId');
        } catch (alterError) {
            console.log('UNIQUE constraint on kapalId already exists or could not be added');
        }
        console.log('✅ Kapal tables created successfully');

        // Initialize Dokumen database (optional)
        if (dokumenPool) {
            console.log('📝 Creating dokumen table...');
            await dokumenPool.query(`
                CREATE TABLE IF NOT EXISTS dokumen (
                    id SERIAL PRIMARY KEY,
                    kapalId INTEGER NOT NULL,
                    nama TEXT NOT NULL,
                    jenis TEXT NOT NULL,
                    nomor TEXT,
                    tanggalTerbit TEXT,
                    "tanggalKadaluarsa" TEXT,
                    status TEXT NOT NULL DEFAULT 'aktif',
                    "filePath" TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Check if filePath column exists and add it if missing
            try {
                const columnCheck = await dokumenPool.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'dokumen'
                    AND column_name = 'filePath'
                `);

                if (columnCheck.rows.length === 0) {
                    console.log('❌ filePath column missing in dokumen database, adding it...');
                    await dokumenPool.query(`ALTER TABLE dokumen ADD COLUMN "filePath" TEXT`);
                    console.log('✅ filePath column added successfully to dokumen database');
                } else {
                    console.log('✅ filePath column already exists in dokumen database');
                }
            } catch (alterError) {
                console.log('Error checking/adding filePath column in dokumen database:', alterError.message);
            }

            console.log('✅ Dokumen table created successfully');
        } else {
            console.log('⚠️  Skipping dokumen table creation - DATABASE_URL_DOKUMEN not configured');
        }

        // Initialize Kapal Masuk database
        console.log('📝 Creating kapal_masuk table...');
        await kapalMasukPool.query(`
            CREATE SCHEMA IF NOT EXISTS kapal_masuk_schema
        `);
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
                durasiBerlayar TEXT,
                statusKerja TEXT NOT NULL DEFAULT 'persiapan',
                checklistStates TEXT NOT NULL DEFAULT '{}',
                checklistDates TEXT NOT NULL DEFAULT '{}'
            )
        `);

        // Add missing columns if they don't exist
        const columnsToCheck = ['durasiBerlayar', 'status', 'checklistStates', 'checklistDates', 'newItemsAddedAfterFinish'];
        for (const col of columnsToCheck) {
            try {
                const columnCheck = await kapalMasukPool.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'kapal_masuk_schema'
                    AND table_name = 'kapal_masuk'
                    AND column_name = $1
                `, [col]);

                if (columnCheck.rows.length === 0) {
                    const defaultValue = col === 'newItemsAddedAfterFinish' ? "'[]'" : "'{}'";
                    await kapalMasukPool.query(`ALTER TABLE kapal_masuk_schema.kapal_masuk ADD COLUMN "${col}" TEXT NOT NULL DEFAULT ${defaultValue}`);
                    console.log(`✅ Added missing column ${col}`);
                } else {
                    console.log(`Column ${col} already exists`);
                }
            } catch (alterError) {
                console.log(`Migration error for ${col} (this may be expected):`, alterError.message);
            }
        }
        console.log('✅ Kapal Masuk table created successfully');

        console.log('✅ All database tables initialized successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Connect to databases and initialize
const connectPromises = [
    usersPool.connect(),
    kapalPool.connect(),
    kapalMasukPool.connect()
];

if (dokumenPool) {
    connectPromises.push(dokumenPool.connect());
}

Promise.allSettled(connectPromises).then((results) => {
    // Check connection results
    const usersResult = results[0];
    const kapalResult = results[1];
    const kapalMasukResult = results[2];
    let dokumenResult = null;

    if (dokumenPool) {
        dokumenResult = results[3];
        if (dokumenResult.status === 'rejected') {
            console.error('Failed to connect to dokumen database:', dokumenResult.reason.message);
            console.log('Dokumen functionality will be disabled.');
            dokumenPool = null;
        }
    }

    // Check if required databases connected successfully
    if (usersResult.status === 'rejected' || kapalResult.status === 'rejected' || kapalMasukResult.status === 'rejected') {
        console.error('Error connecting to required databases:');
        if (usersResult.status === 'rejected') console.error('Users DB:', usersResult.reason.message);
        if (kapalResult.status === 'rejected') console.error('Kapal DB:', kapalResult.reason.message);
        if (kapalMasukResult.status === 'rejected') console.error('Kapal Masuk DB:', kapalMasukResult.reason.message);
        throw new Error('Required database connection failed');
    }

    console.log('Connected to all required PostgreSQL databases.');
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
        version: '1.03.03',
        updateLink: 'https://drive.google.com/file/d/1aB7tJ-XSJdQdcT5nf01Du4szv2s6lpoA/view?usp=sharing',
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to check database (temporary)
app.get('/debug/database', async (req, res) => {
    try {
        console.log('🔍 Debug: Checking database contents...');

        // Check users database
        let usersData = [];
        try {
            const usersResult = await usersPool.query('SELECT userId, nama, role, created_at FROM users ORDER BY created_at DESC');
            usersData = usersResult.rows;
            console.log('Users in database:', usersData.length);
        } catch (usersError) {
            console.log('Users database error:', usersError.message);
        }

        // Check kapal database
        let kapalData = [];
        try {
            const kapalResult = await kapalPool.query('SELECT id, nama FROM kapal_info ORDER BY id DESC LIMIT 5');
            kapalData = kapalResult.rows;
            console.log('Kapal in database:', kapalData.length);
        } catch (kapalError) {
            console.log('Kapal database error:', kapalError.message);
        }

        // Check dokumen database
        let dokumenData = [];
        try {
            if (dokumenPool) {
                const dokumenResult = await dokumenPool.query('SELECT id, nama FROM dokumen ORDER BY id DESC LIMIT 5');
                dokumenData = dokumenResult.rows;
                console.log('Dokumen in database:', dokumenData.length);
            } else {
                console.log('Dokumen database not configured');
            }
        } catch (dokumenError) {
            console.log('Dokumen database error:', dokumenError.message);
        }

        // Check kapal masuk database
        let kapalMasukData = [];
        try {
            const kapalMasukResult = await kapalMasukPool.query('SELECT id, nama FROM kapal_masuk_schema.kapal_masuk ORDER BY id DESC LIMIT 5');
            kapalMasukData = kapalMasukResult.rows;
            console.log('Kapal Masuk in database:', kapalMasukData.length);
        } catch (kapalMasukError) {
            console.log('Kapal Masuk database error:', kapalMasukError.message);
        }

        res.json({
            success: true,
            message: 'Database debug info',
            data: {
                usersCount: usersData.length,
                users: usersData,
                kapalCount: kapalData.length,
                kapal: kapalData,
                dokumenCount: dokumenData.length,
                dokumen: dokumenData,
                kapalMasukCount: kapalMasukData.length,
                kapalMasuk: kapalMasukData,
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

        const result = await usersPool.query('SELECT * FROM users WHERE userId = $1', [userId]);
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
        const existingResult = await usersPool.query('SELECT userId FROM users WHERE userId = $1', [userId]);
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
            'INSERT INTO users (userId, password, role) VALUES ($1, $2, $3)',
            [userId, hashedPassword, 'Moderator']
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
        const result = await usersPool.query('SELECT userId, nama, role, photoUri, created_at FROM users');
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

        // Build dynamic query based on provided fields
        let setParts = [];
        let params = [];
        let paramIndex = 1;

        if (nama !== undefined && nama !== null) {
            setParts.push(`nama = $${paramIndex++}`);
            params.push(nama);
        }

        if (role !== undefined && role !== null) {
            setParts.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        if (photoUri !== undefined && photoUri !== null) {
            setParts.push(`photoUri = $${paramIndex++}`);
            params.push(photoUri);
        }

        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            setParts.push(`password = $${paramIndex++}`);
            params.push(hashedPassword);
        }

        if (setParts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const query = `UPDATE users SET ${setParts.join(', ')} WHERE userId = $${paramIndex}`;
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

        const result = await usersPool.query('DELETE FROM users WHERE userId = $1', [userId]);

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
        const existingResult = await usersPool.query('SELECT userId FROM users WHERE userId = $1', [userId]);
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
            'INSERT INTO users (userId, password, nama, role) VALUES ($1, $2, $3, $4)',
            [userId, hashedPassword, nama, role]
        );
        console.log('✅ User inserted successfully, rowCount:', insertResult.rowCount);

        console.log('🎉 Create user successful for userId:', userId);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                userId: userId,
                nama: nama
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

// Helper function to convert null values to empty strings for TEXT fields
function sanitizeTextField(value) {
    return value === null || value === undefined ? '' : value;
}

// Kapal routes (protected)
app.get('/api/kapal', authenticateToken, async (req, res) => {
    try {
        // Join kapal_info and kapal_status tables
        const result = await kapalPool.query(`
            SELECT
                ki.id, ki.nama, ki.namaPemilik, ki.tandaSelar, ki.tandaPengenal,
                ki.beratKotor, ki.beratBersih, ki.merekMesin, ki.nomorSeriMesin,
                ki.jenisAlatTangkap, ki.tanggalInput, ki.listDokumen,
                ks.tanggalKeberangkatan, ks.totalHariPersiapan, ks.tanggalBerangkat,
                ks.tanggalKembali, ks.listPersiapan as statusListPersiapan,
                ks.isFinished, ks.perkiraanKeberangkatan, ks.durasiSelesaiPersiapan
            FROM kapal_info ki
            LEFT JOIN kapal_status ks ON ki.id = ks.kapalId
            ORDER BY ki.id DESC
        `);

        const kapal = result.rows;

        // Parse JSON strings back to arrays and convert isFinished to boolean
        const parsedKapal = kapal.map(k => ({
            id: k.id,
            nama: k.nama,
            namaPemilik: k.namapemilik,
            tandaSelar: k.tandaselar,
            tandaPengenal: k.tandapengenal,
            beratKotor: k.beratkotor,
            beratBersih: k.beratbersih,
            merekMesin: k.merekmesin,
            nomorSeriMesin: k.nomorserimesin,
            jenisAlatTangkap: k.jenisalattangkap,
            tanggalInput: k.tanggalinput,
            tanggalKeberangkatan: k.tanggalkeberangkatan,
            totalHariPersiapan: k.totalharipersiapan,
            tanggalBerangkat: k.tanggalberangkat,
            tanggalKembali: k.tanggalkembali,
            listPersiapan: parseListPersiapan(k.statuslistpersiapan || k.listpersiapan),
            listDokumen: JSON.parse(k.listdokumen || '[]'),
            isFinished: Boolean(k.isfinished),
            perkiraanKeberangkatan: k.perkiraanKeberangkatan,
            durasiSelesaiPersiapan: k.durasiselesaiPersiapan
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

        // Join kapal_info and kapal_status tables like the GET /api/kapal route
        const result = await kapalPool.query(`
            SELECT
                ki.id, ki.nama, ki.namaPemilik, ki.tandaSelar, ki.tandaPengenal,
                ki.beratKotor, ki.beratBersih, ki.merekMesin, ki.nomorSeriMesin,
                ki.jenisAlatTangkap, ki.tanggalInput, ki.listDokumen,
                ks.tanggalKeberangkatan, ks.totalHariPersiapan, ks.tanggalBerangkat,
                ks.tanggalKembali, ks.listPersiapan as statusListPersiapan,
                ks.isFinished, ks.perkiraanKeberangkatan, ks.durasiSelesaiPersiapan
            FROM kapal_info ki
            LEFT JOIN kapal_status ks ON ki.id = ks.kapalId
            WHERE ki.id = $1
        `, [id]);

        const kapal = result.rows[0];

        if (!kapal) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        // Parse JSON strings back to arrays and convert isFinished to boolean
        const parsedKapal = {
            id: kapal.id,
            nama: kapal.nama,
            namaPemilik: kapal.namapemilik,
            tandaSelar: kapal.tandaselar,
            tandaPengenal: kapal.tandapengenal,
            beratKotor: kapal.beratkotor,
            beratBersih: kapal.beratbersih,
            merekMesin: kapal.merekmesin,
            nomorSeriMesin: kapal.nomorserimesin,
            jenisAlatTangkap: kapal.jenisalattangkap,
            tanggalInput: kapal.tanggalinput,
            tanggalKeberangkatan: kapal.tanggalkeberangkatan,
            totalHariPersiapan: kapal.totalharipersiapan,
            tanggalBerangkat: kapal.tanggalberangkat,
            tanggalKembali: kapal.tanggalkembali,
            listPersiapan: parseListPersiapan(kapal.statuslistpersiapan || kapal.listpersiapan),
            listDokumen: JSON.parse(kapal.listdokumen || '[]'),
            isFinished: Boolean(kapal.isfinished),
            perkiraanKeberangkatan: kapal.perkiraanKeberangkatan,
            durasiSelesaiPersiapan: kapal.durasiselesaiPersiapan
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

        // Insert into kapal_info first
        const infoResult = await kapalPool.query(`
            INSERT INTO kapal_info (
                nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
                merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput, listDokumen
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
            kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
            kapalData.jenisAlatTangkap, kapalData.tanggalInput, JSON.stringify(kapalData.listDokumen || [])
        ]);

        const kapalInfo = infoResult.rows[0];

        // Insert into kapal_status
        const statusResult = await kapalPool.query(`
            INSERT INTO kapal_status (
                kapalId, tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat,
                tanggalKembali, listPersiapan, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            kapalInfo.id, kapalData.tanggalKeberangkatan, kapalData.totalHariPersiapan,
            kapalData.tanggalBerangkat, kapalData.tanggalKembali,
            JSON.stringify(kapalData.listPersiapan || []), kapalData.isFinished ? 1 : 0,
            kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan
        ]);

        const kapalStatus = statusResult.rows[0];

        // Combine the data for response
        const parsedKapal = {
            id: kapalInfo.id,
            nama: kapalInfo.nama,
            namaPemilik: kapalInfo.namapemilik,
            tandaSelar: kapalInfo.tandaselar,
            tandaPengenal: kapalInfo.tandapengenal,
            beratKotor: kapalInfo.beratkotor,
            beratBersih: kapalInfo.beratbersih,
            merekMesin: kapalInfo.merekmesin,
            nomorSeriMesin: kapalInfo.nomorserimesin,
            jenisAlatTangkap: kapalInfo.jenisalattangkap,
            tanggalInput: kapalInfo.tanggalinput,
            listDokumen: JSON.parse(kapalInfo.listdokumen || '[]'),
            tanggalKeberangkatan: kapalStatus.tanggalkeberangkatan,
            totalHariPersiapan: kapalStatus.totalharipersiapan,
            tanggalBerangkat: kapalStatus.tanggalberangkat,
            tanggalKembali: kapalStatus.tanggalkembali,
            listPersiapan: parseListPersiapan(kapalStatus.listpersiapan),
            isFinished: Boolean(kapalStatus.isfinished),
            perkiraanKeberangkatan: kapalStatus.perkiraankeberangkatan,
            durasiSelesaiPersiapan: kapalStatus.durasiselesaiPersiapan
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

        // Update kapal_info
        const infoResult = await kapalPool.query(`
            UPDATE kapal_info SET
                nama = $1, namaPemilik = $2, tandaSelar = $3, tandaPengenal = $4,
                beratKotor = $5, beratBersih = $6, merekMesin = $7, nomorSeriMesin = $8,
                jenisAlatTangkap = $9, tanggalInput = $10, listDokumen = $11
            WHERE id = $12
        `, [
            kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
            kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
            kapalData.jenisAlatTangkap, kapalData.tanggalInput, JSON.stringify(kapalData.listDokumen || []),
            id
        ]);

        // Update or insert kapal_status
        const statusResult = await kapalPool.query(`
            INSERT INTO kapal_status (
                kapalId, tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat,
                tanggalKembali, listPersiapan, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (kapalId) DO UPDATE SET
                tanggalKeberangkatan = EXCLUDED.tanggalKeberangkatan,
                totalHariPersiapan = EXCLUDED.totalHariPersiapan,
                tanggalBerangkat = EXCLUDED.tanggalBerangkat,
                tanggalKembali = EXCLUDED.tanggalKembali,
                listPersiapan = EXCLUDED.listPersiapan,
                isFinished = EXCLUDED.isFinished,
                perkiraanKeberangkatan = EXCLUDED.perkiraanKeberangkatan,
                durasiSelesaiPersiapan = EXCLUDED.durasiSelesaiPersiapan
        `, [
            id, kapalData.tanggalKeberangkatan, kapalData.totalHariPersiapan,
            kapalData.tanggalBerangkat, kapalData.tanggalKembali,
            JSON.stringify(kapalData.listPersiapan || []), kapalData.isFinished ? 1 : 0,
            kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan
        ]);

        if (infoResult.rowCount === 0) {
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

        // Delete from kapal_info (kapal_status will be deleted automatically due to CASCADE)
        const result = await kapalPool.query('DELETE FROM kapal_info WHERE id = $1', [id]);

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

// Get ship names only from DATABASE_URL_KAPAL
app.get('/api/kapal/names', authenticateToken, async (req, res) => {
    try {
        const result = await kapalPool.query('SELECT nama FROM kapal_info ORDER BY nama ASC');
        const shipNames = result.rows.map(row => row.nama);

        res.json({
            success: true,
            message: 'Ship names retrieved successfully',
            data: shipNames
        });
    } catch (error) {
        console.error('Get ship names error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

// Dokumen routes (protected)
app.get('/api/dokumen', authenticateToken, async (req, res) => {
    const pool = kapalPool;
    if (!pool) {
        return res.json({
            success: true,
            message: 'Dokumen database not configured - no documents available',
            data: []
        });
    }

    try {
        const result = await pool.query('SELECT * FROM dokumen ORDER BY id DESC');
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
    const pool = kapalPool;
    if (!pool) {
        return res.json({
            success: true,
            message: 'Dokumen database not configured - no documents available for this ship',
            data: []
        });
    }

    try {
        const { kapalId } = req.params;
        const result = await pool.query('SELECT * FROM dokumen WHERE kapalId = $1 ORDER BY id DESC', [kapalId]);
        res.json({
            success: true,
            message: 'Dokumen retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get dokumen by kapalId error:', error);
        // Return success with empty data instead of error to handle database issues gracefully
        res.json({
            success: true,
            message: 'Dokumen database error - no documents available for this ship',
            data: []
        });
    }
});

app.get('/api/dokumen/:id', authenticateToken, async (req, res) => {
    const pool = kapalPool;
    if (!pool) {
        return res.status(503).json({
            success: false,
            message: 'Dokumen database not configured'
        });
    }

    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM dokumen WHERE id = $1', [id]);
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
    const pool = kapalPool;
    if (!pool) {
        return res.status(200).json({
            success: true,
            message: 'Dokumen database not configured - cannot add documents',
            data: null
        });
    }

    try {
        const dokumenData = req.body;
        const result = await pool.query(`
            INSERT INTO dokumen (
                kapalId, nama, jenis, nomor, tanggalTerbit, "tanggalKadaluarsa", status, filePath
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
    const pool = kapalPool;
    console.log('PUT /api/dokumen/:id called, pool available:', !!pool);
    if (!pool) {
        return res.status(503).json({
            success: false,
            message: 'Dokumen database not configured'
        });
    }

    try {
        // Ensure dokumen table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dokumen (
                id SERIAL PRIMARY KEY,
                kapalId INTEGER NOT NULL,
                nama TEXT NOT NULL,
                jenis TEXT NOT NULL,
                nomor TEXT,
                tanggalTerbit TEXT,
                tanggalKadaluarsa TEXT,
                status TEXT NOT NULL DEFAULT 'aktif',
                "filePath" TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Ensured dokumen table exists for update operation');

        const { id } = req.params;
        const dokumenData = req.body;
        console.log('Updating dokumen id:', id, 'with data:', JSON.stringify(dokumenData, null, 2));

        // Get current dokumen data for logging
        const currentResult = await pool.query('SELECT "tanggalKadaluarsa" FROM dokumen WHERE id = $1', [id]);
        const currentDokumen = currentResult.rows[0];

        const result = await pool.query(`
            UPDATE dokumen SET
                kapalId = $1, nama = $2, jenis = $3, nomor = $4,
                tanggalTerbit = $5, "tanggalKadaluarsa" = $6, status = $7, "filePath" = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [
            dokumenData.kapalId, dokumenData.nama, dokumenData.jenis, dokumenData.nomor,
            dokumenData.tanggalTerbit, dokumenData.tanggalKadaluarsa, dokumenData.status,
            dokumenData.filePath, id
        ]);

        console.log('Update result rowCount:', result.rowCount);
        if (result.rowCount === 0) {
            console.log('Dokumen not found for id:', id);
            return res.status(404).json({
                success: false,
                message: 'Dokumen not found'
            });
        }

        // Log tanggalKadaluarsa changes
        if (currentDokumen && currentDokumen.tanggalKadaluarsa !== dokumenData.tanggalKadaluarsa) {
            console.log(`📅 Tanggal Kadaluarsa updated for dokumen id ${id}:`);
            console.log(`   Old: ${currentDokumen.tanggalKadaluarsa || 'null'}`);
            console.log(`   New: ${dokumenData.tanggalKadaluarsa || 'null'}`);
        }

        console.log('Dokumen updated successfully');
        res.json({
            success: true,
            message: 'Dokumen updated successfully'
        });
    } catch (error) {
        console.error('Update dokumen error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to update dokumen: ' + error.message
        });
    }
});

app.delete('/api/dokumen/:id', authenticateToken, async (req, res) => {
    const pool = kapalPool;
    if (!pool) {
        return res.status(503).json({
            success: false,
            message: 'Dokumen database not configured'
        });
    }

    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM dokumen WHERE id = $1', [id]);

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

// Kapal Status routes (protected) - Independent from kapal_info
app.get('/api/kapal-status', authenticateToken, async (req, res) => {
    try {
        const result = await kapalPool.query('SELECT * FROM kapal_status ORDER BY id DESC');
        const kapalStatus = result.rows;

        // Parse JSON strings back to arrays and convert isFinished to boolean
        const parsedKapalStatus = kapalStatus.map(k => ({
            ...k,
            listPersiapan: parseListPersiapan(k.listpersiapan),
            isFinished: Boolean(k.isfinished)
        }));

        res.json({
            success: true,
            message: 'Kapal Status retrieved successfully',
            data: parsedKapalStatus
        });
    } catch (error) {
        console.error('Get kapal status error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.get('/api/kapal-status/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await kapalPool.query('SELECT * FROM kapal_status WHERE id = $1', [id]);
        const kapalStatus = result.rows[0];

        if (!kapalStatus) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Status not found'
            });
        }

        // Parse JSON strings back to arrays
        const parsedKapalStatus = {
            ...kapalStatus,
            listPersiapan: parseListPersiapan(kapalStatus.listpersiapan),
            isFinished: Boolean(kapalStatus.isfinished)
        };

        res.json({
            success: true,
            message: 'Kapal Status retrieved successfully',
            data: parsedKapalStatus
        });
    } catch (error) {
        console.error('Get kapal status by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error'
        });
    }
});

app.post('/api/kapal-status', authenticateToken, async (req, res) => {
    try {
        const kapalStatusData = req.body;
        const result = await kapalPool.query(`
            INSERT INTO kapal_status (
                kapalId, tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat,
                tanggalKembali, listPersiapan, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            kapalStatusData.kapalId, kapalStatusData.tanggalKeberangkatan, kapalStatusData.totalHariPersiapan,
            kapalStatusData.tanggalBerangkat, kapalStatusData.tanggalKembali,
            JSON.stringify(kapalStatusData.listPersiapan || []), kapalStatusData.isFinished ? 1 : 0,
            kapalStatusData.perkiraanKeberangkatan, kapalStatusData.durasiSelesaiPersiapan
        ]);

        const kapalStatus = result.rows[0];

        // Parse JSON strings back to arrays
        const parsedKapalStatus = {
            ...kapalStatus,
            listPersiapan: parseListPersiapan(kapalStatus.listpersiapan),
            isFinished: Boolean(kapalStatus.isfinished)
        };

        res.status(201).json({
            success: true,
            message: 'Kapal Status created successfully',
            data: parsedKapalStatus
        });
    } catch (error) {
        console.error('Create kapal status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create kapal status'
        });
    }
});

app.put('/api/kapal-status/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const kapalStatusData = req.body;

        const result = await kapalPool.query(`
            UPDATE kapal_status SET
                kapalId = $1, tanggalKeberangkatan = $2, totalHariPersiapan = $3,
                tanggalBerangkat = $4, tanggalKembali = $5, listPersiapan = $6,
                isFinished = $7, perkiraanKeberangkatan = $8, durasiSelesaiPersiapan = $9
            WHERE id = $10
        `, [
            kapalStatusData.kapalId, kapalStatusData.tanggalKeberangkatan, kapalStatusData.totalHariPersiapan,
            kapalStatusData.tanggalBerangkat, kapalStatusData.tanggalKembali,
            JSON.stringify(kapalStatusData.listPersiapan || []), kapalStatusData.isFinished ? 1 : 0,
            kapalStatusData.perkiraanKeberangkatan, kapalStatusData.durasiSelesaiPersiapan, id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Status not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal Status updated successfully'
        });
    } catch (error) {
        console.error('Update kapal status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update kapal status'
        });
    }
});

app.delete('/api/kapal-status/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await kapalPool.query('DELETE FROM kapal_status WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal Status not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal Status deleted successfully'
        });
    } catch (error) {
        console.error('Delete kapal status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete kapal status'
        });
    }
});

// Kapal Masuk routes (protected)
app.get('/api/kapal-masuk', authenticateToken, async (req, res) => {
    try {
        const result = await kapalMasukPool.query('SELECT * FROM kapal_masuk_schema.kapal_masuk ORDER BY id DESC');
        const kapalMasuk = result.rows;

        // Parse JSON strings back to arrays and convert isFinished to boolean, and map to camelCase
        const parsedKapalMasuk = kapalMasuk.map(k => ({
            id: k.id,
            nama: k.nama,
            namaPemilik: k.namapemilik,
            tandaSelar: k.tandaselar,
            tandaPengenal: k.tandapengenal,
            beratKotor: k.beratkotor,
            beratBersih: k.beratbersih,
            merekMesin: k.merekmesin,
            nomorSeriMesin: k.nomorserimesin,
            jenisAlatTangkap: k.jenisalattangkap,
            tanggalInput: k.tanggalinput,
            tanggalKeberangkatan: k.tanggalkeberangkatan,
            totalHariPersiapan: k.totalharipersiapan,
            tanggalBerangkat: k.tanggalberangkat,
            tanggalKembali: k.tanggalkembali,
            listPersiapan: parseListPersiapan(k.listpersiapan),
            isFinished: Boolean(k.isfinished),
            perkiraanKeberangkatan: k.perkiraankeberangkatan,
            durasiSelesaiPersiapan: k.durasiselesaiPersiapan,
            durasiBerlayar: k.durasiberlayar,
            status: k.status,
            statusKerja: k.statuskerja,
            checklistStates: JSON.parse(k.checklistStates || '{}'),
            checklistDates: JSON.parse(k.checklistDates || '{}'),
            newItemsAddedAfterFinish: JSON.parse(k.newItemsAddedAfterFinish || '[]')
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

        // Parse JSON strings back to arrays and map to camelCase
        const parsedKapalMasuk = {
            id: kapalMasuk.id,
            nama: kapalMasuk.nama,
            namaPemilik: kapalMasuk.namapemilik,
            tandaSelar: kapalMasuk.tandaselar,
            tandaPengenal: kapalMasuk.tandapengenal,
            beratKotor: kapalMasuk.beratkotor,
            beratBersih: kapalMasuk.beratbersih,
            merekMesin: kapalMasuk.merekmesin,
            nomorSeriMesin: kapalMasuk.nomorserimesin,
            jenisAlatTangkap: kapalMasuk.jenisalattangkap,
            tanggalInput: kapalMasuk.tanggalinput,
            tanggalKeberangkatan: kapalMasuk.tanggalkeberangkatan,
            totalHariPersiapan: kapalMasuk.totalharipersiapan,
            tanggalBerangkat: kapalMasuk.tanggalberangkat,
            tanggalKembali: kapalMasuk.tanggalkembali,
            listPersiapan: parseListPersiapan(kapalMasuk.listpersiapan),
            isFinished: Boolean(kapalMasuk.isfinished),
            perkiraanKeberangkatan: kapalMasuk.perkiraankeberangkatan,
            durasiSelesaiPersiapan: kapalMasuk.durasiselesaiPersiapan,
            durasiBerlayar: kapalMasuk.durasiberlayar,
            statusKerja: kapalMasuk.statuskerja,
            checklistStates: JSON.parse(kapalMasuk.checklistStates || '{}'),
            checklistDates: JSON.parse(kapalMasuk.checklistDates || '{}'),
            newItemsAddedAfterFinish: JSON.parse(kapalMasuk.newItemsAddedAfterFinish || '[]')
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
                merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput,
                tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat, tanggalKembali,
                listPersiapan, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan,
                durasiBerlayar, status, statusKerja
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `, [
            sanitizeTextField(kapalMasukData.nama), sanitizeTextField(kapalMasukData.namaPemilik), sanitizeTextField(kapalMasukData.tandaSelar), sanitizeTextField(kapalMasukData.tandaPengenal),
            sanitizeTextField(kapalMasukData.beratKotor), sanitizeTextField(kapalMasukData.beratBersih), sanitizeTextField(kapalMasukData.merekMesin), sanitizeTextField(kapalMasukData.nomorSeriMesin),
            sanitizeTextField(kapalMasukData.jenisAlatTangkap), sanitizeTextField(kapalMasukData.tanggalInput), sanitizeTextField(kapalMasukData.tanggalKeberangkatan),
            kapalMasukData.totalHariPersiapan, sanitizeTextField(kapalMasukData.tanggalBerangkat), sanitizeTextField(kapalMasukData.tanggalKembali),
            JSON.stringify(kapalMasukData.listPersiapan || []), kapalMasukData.isFinished ? 1 : 0,
            sanitizeTextField(kapalMasukData.perkiraanKeberangkatan), sanitizeTextField(kapalMasukData.durasiSelesaiPersiapan),
            sanitizeTextField(kapalMasukData.durasiBerlayar), sanitizeTextField(kapalMasukData.status) || '',
            sanitizeTextField(kapalMasukData.statusKerja) || 'persiapan'
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
                durasiSelesaiPersiapan = $18, durasiBerlayar = $19, status = $20, statusKerja = $21,
                "checklistStates" = $22, "checklistDates" = $23, "newItemsAddedAfterFinish" = $24
            WHERE id = $25
        `, [
            sanitizeTextField(kapalMasukData.nama), sanitizeTextField(kapalMasukData.namaPemilik), sanitizeTextField(kapalMasukData.tandaSelar), sanitizeTextField(kapalMasukData.tandaPengenal),
            sanitizeTextField(kapalMasukData.beratKotor), sanitizeTextField(kapalMasukData.beratBersih), sanitizeTextField(kapalMasukData.merekMesin), sanitizeTextField(kapalMasukData.nomorSeriMesin),
            sanitizeTextField(kapalMasukData.jenisAlatTangkap), sanitizeTextField(kapalMasukData.tanggalInput), sanitizeTextField(kapalMasukData.tanggalKeberangkatan),
            kapalMasukData.totalHariPersiapan, sanitizeTextField(kapalMasukData.tanggalBerangkat), sanitizeTextField(kapalMasukData.tanggalKembali),
            JSON.stringify(kapalMasukData.listPersiapan || []), kapalMasukData.isFinished ? 1 : 0,
            sanitizeTextField(kapalMasukData.perkiraanKeberangkatan), sanitizeTextField(kapalMasukData.durasiSelesaiPersiapan),
            sanitizeTextField(kapalMasukData.durasiBerlayar), sanitizeTextField(kapalMasukData.status),
            sanitizeTextField(kapalMasukData.statusKerja),
            JSON.stringify(kapalMasukData.checklistStates || {}), JSON.stringify(kapalMasukData.checklistDates || {}), JSON.stringify(kapalMasukData.newItemsAddedAfterFinish || []), id
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

// Migration endpoint (protected) - for updating file URLs to Railway
app.post('/api/migrate-file-urls', authenticateToken, async (req, res) => {
    try {
        console.log('🚀 Starting file URL migration via API...');

        // Import the migration function
        const migrateFileUrlsToRailway = require('./migrate-file-urls-to-railway.js');

        // Create a promise to handle the migration and capture logs
        const migrationPromise = new Promise(async (resolve, reject) => {
            try {
                // Override console.log to capture output
                const originalLog = console.log;
                const logs = [];

                console.log = (...args) => {
                    logs.push(args.join(' '));
                    originalLog(...args);
                };

                // Run the migration
                await migrateFileUrlsToRailway();

                // Restore console.log
                console.log = originalLog;

                resolve(logs);
            } catch (error) {
                reject(error);
            }
        });

        const logs = await migrationPromise;

        res.json({
            success: true,
            message: 'File URL migration completed',
            data: {
                logs: logs,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Migration API error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KapalList Backend server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    try {
        const endPromises = [
            usersPool.end(),
            kapalPool.end(),
            kapalMasukPool.end()
        ];

        if (dokumenPool) {
            endPromises.push(dokumenPool.end());
        }

        await Promise.all(endPromises);
        console.log('All database connections closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error closing database connections:', err);
        process.exit(1);
    }
});

module.exports = app;
