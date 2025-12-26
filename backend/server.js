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

// Database setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                nama TEXT,
                email TEXT,
                photoUri TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Kapal table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS kapal (
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

        console.log('Database tables initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Connect to database and initialize
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to PostgreSQL database.');
        initializeDatabase();
        release();
    }
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

        const result = await pool.query('SELECT * FROM users WHERE userId = $1', [userId]);
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
                    email: user.email,
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

        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        // Check if user already exists
        const existingResult = await pool.query('SELECT userId FROM users WHERE userId = $1', [userId]);
        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        await pool.query(
            'INSERT INTO users (userId, password) VALUES ($1, $2)',
            [userId, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                userId: userId
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// User routes (protected)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT userId, nama, email, photoUri, created_at FROM users');
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: result.rows
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
        const { nama, email, photoUri } = req.body;

        const result = await pool.query(
            'UPDATE users SET nama = $1, email = $2, photoUri = $3 WHERE userId = $4',
            [nama, email, photoUri, userId]
        );

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

        const result = await pool.query('DELETE FROM users WHERE userId = $1', [userId]);

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
        const result = await pool.query('SELECT * FROM kapal ORDER BY id DESC');
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

        const result = await pool.query('SELECT * FROM kapal WHERE id = $1', [id]);
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

        const result = await pool.query(`
            INSERT INTO kapal (
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
            kapalData.isFinished || 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan
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

        const result = await pool.query(`
            UPDATE kapal SET
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
            kapalData.isFinished || 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan,
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

        const result = await pool.query('DELETE FROM kapal WHERE id = $1', [id]);

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
    pool.end(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});

module.exports = app;
