const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
const db = new sqlite3.Database('./kapallist.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            nama TEXT,
            email TEXT,
            photoUri TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Kapal table
    db.run(`
        CREATE TABLE IF NOT EXISTS kapal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
}

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

        db.get('SELECT * FROM users WHERE userId = ?', [userId], async (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

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
                { userId: user.userId, nama: user.nama },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        userId: user.userId,
                        nama: user.nama,
                        email: user.email,
                        photoUri: user.photoUri
                    }
                }
            });
        });
    } catch (error) {
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
        db.get('SELECT userId FROM users WHERE userId = ?', [userId], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run(
                'INSERT INTO users (userId, password) VALUES (?, ?)',
                [userId, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to create user'
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: 'User created successfully',
                        data: {
                            userId: userId
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// User routes (protected)
app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT userId, nama, email, photoUri, created_at FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: users
        });
    });
});

app.put('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { nama, email, photoUri } = req.body;

        db.run(
            'UPDATE users SET nama = ?, email = ?, photoUri = ? WHERE userId = ?',
            [nama, email, photoUri, userId],
            function(err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update user'
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'User updated successfully'
                });
            }
        );
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.delete('/api/users/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;

    db.run('DELETE FROM users WHERE userId = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    });
});

// Helper function to safely parse listPersiapan
function parseListPersiapan(value) {
    if (!value || value === '[]') return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        // If it's a string, try to split by comma or newline
        if (typeof parsed === 'string') {
            return parsed.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0);
        }
        return [];
    } catch (e) {
        // If JSON.parse fails, treat as comma-separated string
        return value.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0);
    }
}

// Kapal routes (protected)
app.get('/api/kapal', authenticateToken, (req, res) => {
    db.all('SELECT * FROM kapal ORDER BY id DESC', [], (err, kapal) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        // Parse JSON strings back to arrays
        const parsedKapal = kapal.map(k => ({
            ...k,
            listPersiapan: parseListPersiapan(k.listPersiapan),
            listDokumen: JSON.parse(k.listDokumen || '[]')
        }));

        res.json({
            success: true,
            message: 'Kapal retrieved successfully',
            data: parsedKapal
        });
    });
});

app.get('/api/kapal/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM kapal WHERE id = ?', [id], (err, kapal) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (!kapal) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        // Parse JSON strings back to arrays
        const parsedKapal = {
            ...kapal,
            listPersiapan: parseListPersiapan(kapal.listPersiapan),
            listDokumen: JSON.parse(kapal.listDokumen || '[]')
        };

        res.json({
            success: true,
            message: 'Kapal retrieved successfully',
            data: parsedKapal
        });
    });
});

app.post('/api/kapal', authenticateToken, (req, res) => {
    const kapalData = req.body;

    const sql = `
        INSERT INTO kapal (
            nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
            merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput, tanggalKeberangkatan,
            totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan, listDokumen,
            isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
        kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
        kapalData.jenisAlatTangkap, kapalData.tanggalInput, kapalData.tanggalKeberangkatan,
        kapalData.totalHariPersiapan, kapalData.tanggalBerangkat, kapalData.tanggalKembali,
        JSON.stringify(kapalData.listPersiapan || []), JSON.stringify(kapalData.listDokumen || []),
        kapalData.isFinished || 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan
    ];

    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create kapal'
            });
        }

        // Get the created kapal
        db.get('SELECT * FROM kapal WHERE id = ?', [this.lastID], (err, kapal) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to retrieve created kapal'
                });
            }

            // Parse JSON strings back to arrays
            const parsedKapal = {
                ...kapal,
                listPersiapan: parseListPersiapan(kapal.listPersiapan),
                listDokumen: JSON.parse(kapal.listDokumen || '[]')
            };

            res.status(201).json({
                success: true,
                message: 'Kapal created successfully',
                data: parsedKapal
            });
        });
    });
});

app.put('/api/kapal/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const kapalData = req.body;

    const sql = `
        UPDATE kapal SET
            nama = ?, namaPemilik = ?, tandaSelar = ?, tandaPengenal = ?,
            beratKotor = ?, beratBersih = ?, merekMesin = ?, nomorSeriMesin = ?,
            jenisAlatTangkap = ?, tanggalInput = ?, tanggalKeberangkatan = ?,
            totalHariPersiapan = ?, tanggalBerangkat = ?, tanggalKembali = ?,
            listPersiapan = ?, listDokumen = ?, isFinished = ?,
            perkiraanKeberangkatan = ?, durasiSelesaiPersiapan = ?
        WHERE id = ?
    `;

    const values = [
        kapalData.nama, kapalData.namaPemilik, kapalData.tandaSelar, kapalData.tandaPengenal,
        kapalData.beratKotor, kapalData.beratBersih, kapalData.merekMesin, kapalData.nomorSeriMesin,
        kapalData.jenisAlatTangkap, kapalData.tanggalInput, kapalData.tanggalKeberangkatan,
        kapalData.totalHariPersiapan, kapalData.tanggalBerangkat, kapalData.tanggalKembali,
        JSON.stringify(kapalData.listPersiapan || []), JSON.stringify(kapalData.listDokumen || []),
        kapalData.isFinished || 0, kapalData.perkiraanKeberangkatan, kapalData.durasiSelesaiPersiapan,
        id
    ];

    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update kapal'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal updated successfully'
        });
    });
});

app.delete('/api/kapal/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM kapal WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete kapal'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kapal not found'
            });
        }

        res.json({
            success: true,
            message: 'Kapal deleted successfully'
        });
    });
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
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

module.exports = app;
