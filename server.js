const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Connection, Request, TYPES } = require('tedious');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// Increase timeout for large file uploads
app.use((req, res, next) => {
    req.setTimeout(120000); // 2 minutes
    res.setTimeout(120000); // 2 minutes
    next();
});

// Configure multer for file uploads (max 50MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Email Configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Send verification email
async function sendVerificationEmail(email, username, verificationToken) {
    try {
        // Check if email is configured (not placeholder)
        if (process.env.EMAIL_USER?.includes('@') === false || process.env.EMAIL_USER?.includes('your-email') || !process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD.includes('your-app-password')) {
            console.warn('⚠️  Email not configured - verification email not sent');
            return true; // Return true to allow signup to proceed
        }

        const verificationUrl = `${process.env.VERIFICATION_URL}?token=${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '✉️ StudyCloud - Please Verify Your Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">Welcome to StudyCloud, ${username}!</h2>
                    <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
                    <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: bold;">
                        Verify Email
                    </a>
                    <p>Or copy and paste this link:</p>
                    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

// Azure Blob Storage Configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('notes');

// Azure SQL Connection
const sqlConfig = {
    authentication: {
        type: 'default',
        options: {
            userName: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD
        }
    },
    server: process.env.SQL_SERVER,
    options: {
        database: process.env.SQL_DATABASE,
        encrypt: true,
        trustServerCertificate: false,
        connectionTimeout: 60000,
        requestTimeout: 120000,
        rowCollectionOnRequestCompletion: true,
        connectTimeout: 60000
    }
};

// ======= DATABASE INITIALIZATION =======
async function initializeDatabase() {
    console.log('🔄 Initializing database...');
    console.log(`Connecting to: ${process.env.SQL_SERVER}`);

    const createTablesQuery = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
    CREATE TABLE Users (
      Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      Email NVARCHAR(255) UNIQUE NOT NULL,
      Username NVARCHAR(255) NOT NULL,
      Password NVARCHAR(MAX) NOT NULL,
      IsVerified BIT DEFAULT 0,
      VerificationToken NVARCHAR(MAX),
      ResetToken NVARCHAR(MAX),
      ResetTokenExpiry DATETIME,
      CreatedAt DATETIME DEFAULT GETUTCDATE(),
      UpdatedAt DATETIME DEFAULT GETUTCDATE()
    );
    
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='IsVerified')
    ALTER TABLE Users ADD IsVerified BIT DEFAULT 0;
    
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='VerificationToken')
    ALTER TABLE Users ADD VerificationToken NVARCHAR(MAX);
    
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='ResetToken')
    ALTER TABLE Users ADD ResetToken NVARCHAR(MAX);
    
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='ResetTokenExpiry')
    ALTER TABLE Users ADD ResetTokenExpiry DATETIME;

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Files' and xtype='U')
    CREATE TABLE Files (
      Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      UserId UNIQUEIDENTIFIER NOT NULL,
      Subject NVARCHAR(MAX) NOT NULL,
      Filename NVARCHAR(MAX) NOT NULL,
      BlobName NVARCHAR(MAX) NOT NULL,
      FileSize INT NOT NULL,
      CreatedAt DATETIME DEFAULT GETUTCDATE(),
      UpdatedAt DATETIME DEFAULT GETUTCDATE(),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
  `;

    const migrationQuery = `
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Files')
    BEGIN
        DROP TABLE Files;
    END
    `;

    const recreateFilesQuery = `
    CREATE TABLE Files (
      Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      UserId UNIQUEIDENTIFIER NOT NULL,
      Subject NVARCHAR(MAX) NOT NULL,
      Filename NVARCHAR(MAX) NOT NULL,
      FileData VARBINARY(MAX) NOT NULL,
      FileSize INT NOT NULL,
      CreatedAt DATETIME DEFAULT GETUTCDATE(),
      UpdatedAt DATETIME DEFAULT GETUTCDATE(),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    `;

    try {
        // First, create tables
        const connection1 = new Connection(sqlConfig);
        connection1.on('connect', (err) => {
            if (!err) {
                const request = new Request(createTablesQuery, (err) => {
                    if (err) console.error('Database init error:', err);
                    else {
                        // Database tables created successfully
                        // Now run migration
                        const connection2 = new Connection(sqlConfig);
                        connection2.on('connect', (err) => {
                            if (!err) {
                                // First drop the table
                                const dropRequest = new Request(`
                                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Files')
                                    DROP TABLE Files;
                                `, (err) => {
                                    if (err) {
                                        // Table drop may fail if it doesn't exist, ignore
                                    }

                                    // Then create it fresh
                                    const recreateRequest = new Request(`
                                        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Files' and xtype='U')
                                        CREATE TABLE Files (
                                          Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                                          UserId UNIQUEIDENTIFIER NOT NULL,
                                          Subject NVARCHAR(MAX) NOT NULL,
                                          Filename NVARCHAR(MAX) NOT NULL,
                                          BlobName NVARCHAR(MAX) NOT NULL,
                                          FileSize INT NOT NULL,
                                          CreatedAt DATETIME DEFAULT GETUTCDATE(),
                                          UpdatedAt DATETIME DEFAULT GETUTCDATE(),
                                          FOREIGN KEY (UserId) REFERENCES Users(Id)
                                        );
                                    `, (err) => {
                                        if (err) console.error('Database recreate error:', err);
                                        else { }
                                        connection2.close();
                                    });
                                    connection2.execSql(recreateRequest);
                                });
                                connection2.execSql(dropRequest);
                            } else {
                                console.error('Migration connection error:', err);
                            }
                        });
                        connection2.connect();
                    }
                    connection1.close();
                });
                connection1.execSql(request);
            } else {
                console.error('Connection error:', err);
            }
        });
        connection1.connect();
    } catch (error) {
        console.error('Database error:', error);
    }
}

// ======= JWT MIDDLEWARE =======
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ error: 'Invalid token' });
            req.userId = decoded.userId;
            req.username = decoded.username;
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ======= AUTH ROUTES =======

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, username, password, passwordConfirm } = req.body;

        if (!email || !username || !password || !passwordConfirm) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (password !== passwordConfirm) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const insertQuery = `
            INSERT INTO Users (Id, Email, Username, Password, VerificationToken, IsVerified)
            VALUES (@id, @email, @username, @password, @verificationToken, 0)
        `;

        const connection = new Connection(sqlConfig);
        connection.on('connect', async (err) => {
            if (err) return res.status(500).json({ error: 'Connection failed' });

            const request = new Request(insertQuery, async (err) => {
                connection.close();
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already registered' });
                    }
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Signup failed' });
                }

                // Send verification email
                const emailSent = await sendVerificationEmail(email, username, verificationToken);

                if (!emailSent) {
                    return res.status(500).json({ error: 'Failed to send verification email' });
                }

                res.status(201).json({
                    success: true,
                    message: 'User registered successfully. Please check your email to verify your account.',
                    email: email,
                    requiresVerification: true
                });
            });

            request.addParameter('id', TYPES.UniqueIdentifier, userId);
            request.addParameter('email', TYPES.NVarChar, email, { length: 255 });
            request.addParameter('username', TYPES.NVarChar, username, { length: 255 });
            request.addParameter('password', TYPES.NVarChar, hashedPassword);
            request.addParameter('verificationToken', TYPES.NVarChar, verificationToken);

            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed: ' + error.message });
    }
});

// Sign In
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const query = `SELECT Id, Username, Password, IsVerified FROM Users WHERE Email = @email`;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'Connection failed' });

            const request = new Request(query, async (err, rowCount, rows) => {
                connection.close();
                if (err || rowCount === 0) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }

                const userId = rows[0][0].value.toString();
                const username = rows[0][1].value;
                const hashedPassword = rows[0][2].value;
                const isVerified = rows[0][3].value;

                const passwordMatch = await bcrypt.compare(password, hashedPassword);
                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }

                // Check if email is verified
                if (!isVerified) {
                    return res.status(403).json({
                        error: 'Email not verified',
                        requiresVerification: true
                    });
                }

                const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ success: true, message: 'Login successful', token, userId, username });
            });

            request.addParameter('email', TYPES.NVarChar, email, { length: 255 });
            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Signin failed: ' + error.message });
    }
});

// Verify Email
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const updateQuery = `
            UPDATE Users 
            SET IsVerified = 1, VerificationToken = NULL 
            WHERE VerificationToken = @token
        `;

        const selectQuery = `
            SELECT Id, Email, Username FROM Users 
            WHERE VerificationToken = @token
        `;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'Connection failed' });

            // First check if token exists
            const selectRequest = new Request(selectQuery, (err, rowCount, rows) => {
                if (err) {
                    connection.close();
                    return res.status(500).json({ error: 'Database error' });
                }

                if (rowCount === 0) {
                    connection.close();
                    return res.status(400).json({ error: 'Invalid or expired verification token' });
                }

                const userId = rows[0][0].value.toString();
                const email = rows[0][1].value;
                const username = rows[0][2].value;

                // Token is valid, now update the user
                const updateRequest = new Request(updateQuery, (err) => {
                    connection.close();
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Verification failed' });
                    }

                    // Generate JWT token for immediate login
                    const jwtToken = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

                    res.json({
                        success: true,
                        message: 'Email verified successfully!',
                        token: jwtToken,
                        userId: userId,
                        username: username
                    });
                });

                updateRequest.addParameter('token', TYPES.NVarChar, token);
                connection.execSql(updateRequest);
            });

            selectRequest.addParameter('token', TYPES.NVarChar, token);
            connection.execSql(selectRequest);
        });
        connection.connect();
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Verification failed: ' + error.message });
    }
});

// Resend Verification Email
app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const query = `SELECT Id, Username, IsVerified, VerificationToken FROM Users WHERE Email = @email`;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'Connection failed' });

            const request = new Request(query, async (err, rowCount, rows) => {
                connection.close();

                if (err || rowCount === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const username = rows[0][1].value;
                const isVerified = rows[0][2].value;
                let verificationToken = rows[0][3].value;

                // If already verified, return error
                if (isVerified) {
                    return res.status(400).json({ error: 'Email is already verified' });
                }

                // If no verification token exists, generate a new one
                if (!verificationToken) {
                    verificationToken = crypto.randomBytes(32).toString('hex');

                    const updateQuery = `
                        UPDATE Users 
                        SET VerificationToken = @verificationToken 
                        WHERE Email = @email
                    `;

                    const updateConnection = new Connection(sqlConfig);
                    updateConnection.on('connect', (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to generate verification token' });
                        }

                        const updateRequest = new Request(updateQuery, async (err) => {
                            updateConnection.close();
                            if (err) {
                                return res.status(500).json({ error: 'Failed to update verification token' });
                            }

                            // Send email
                            const emailSent = await sendVerificationEmail(email, username, verificationToken);
                            if (!emailSent) {
                                return res.status(500).json({ error: 'Failed to send verification email' });
                            }

                            res.json({ success: true, message: 'Verification email sent successfully' });
                        });

                        updateRequest.addParameter('email', TYPES.NVarChar, email, { length: 255 });
                        updateRequest.addParameter('verificationToken', TYPES.NVarChar, verificationToken);
                        updateConnection.execSql(updateRequest);
                    });
                    updateConnection.connect();
                } else {
                    // Send verification email with existing token
                    const emailSent = await sendVerificationEmail(email, username, verificationToken);
                    if (!emailSent) {
                        return res.status(500).json({ error: 'Failed to send verification email' });
                    }

                    res.json({ success: true, message: 'Verification email sent successfully' });
                }
            });

            request.addParameter('email', TYPES.NVarChar, email, { length: 255 });
            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email: ' + error.message });
    }
});

// Verify Token
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({ success: true, userId: req.userId, username: req.username });
});

// ======= API ROUTES =======

// 1. Upload File (Now with BLOB Storage)
app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const { subject, filename } = req.body;
        if (!subject || !filename || !req.file) return res.status(400).json({ error: 'Missing required fields' });

        const fileId = uuidv4();
        const blobName = `${req.userId}/${fileId}-${filename}`;
        
        console.log(`📤 Uploading to BLOB: ${blobName}`);

        // 1. Upload to Azure Blob Storage
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });

        // 2. Insert metadata into SQL database
        const insertQuery = `
            INSERT INTO Files (Id, UserId, Subject, Filename, BlobName, FileSize)
            VALUES (@id, @userId, @subject, @filename, @blobName, @fileSize)
        `;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'DB Connection failed' });

            const request = new Request(insertQuery, (err) => {
                connection.close();
                if (err) return res.status(500).json({ error: 'DB Insert failed: ' + err.message });
                res.json({ success: true, fileId, message: 'File uploaded to Blob Storage' });
            });

            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            request.addParameter('userId', TYPES.UniqueIdentifier, req.userId);
            request.addParameter('subject', TYPES.NVarChar, subject);
            request.addParameter('filename', TYPES.NVarChar, filename);
            request.addParameter('blobName', TYPES.NVarChar, blobName);
            request.addParameter('fileSize', TYPES.Int, req.file.size);

            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// 2. Get Files List (all users' files)
app.get('/api/files', async (req, res) => {
    try {
        const query = `
            SELECT f.Id, f.Subject, f.Filename, f.FileSize, f.CreatedAt, u.Username
            FROM Files f
            JOIN Users u ON f.UserId = u.Id
            ORDER BY f.CreatedAt DESC
        `;

        const connection = new Connection(sqlConfig);

        connection.on('connect', (err) => {
            if (err) {
                console.error('Connection error:', err);
                return res.status(500).json({ error: 'Connection failed' });
            }

            const request = new Request(query, (err, rowCount, rows) => {
                connection.close();
                if (err) {
                    console.error('Query error:', err);
                    return res.status(500).json({ error: 'Database error: ' + err.message });
                }

                if (!rows || rows.length === 0) {
                    return res.json([]);
                }

                const files = rows.map(row => ({
                    id: row[0].value.toString(),
                    subject: row[1].value,
                    filename: row[2].value,
                    fileSize: row[3].value,
                    createdAt: row[4].value,
                    uploadedBy: row[5].value
                }));

                res.json(files);
            });

            connection.execSql(request);
        });

        connection.connect();
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
    }
});

// 3. View File (From Blob)
app.get('/api/files/:fileId/view', async (req, res) => {
    try {
        const { fileId } = req.params;
        const query = `SELECT Filename, BlobName FROM Files WHERE Id = @id`;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'DB Connection failed' });

            const request = new Request(query, async (err, rowCount, rows) => {
                connection.close();
                if (err || rowCount === 0) return res.status(404).json({ error: 'File not found' });

                const filename = rows[0][0].value;
                const blobName = rows[0][1].value;

                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                const downloadResponse = await blockBlobClient.download(0);

                res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
                res.setHeader('Content-Type', downloadResponse.contentType);
                downloadResponse.readableStreamBody.pipe(res);
            });

            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        res.status(500).json({ error: 'View failed' });
    }
});

// 3b. Download File (From Blob)
app.get('/api/files/:fileId/download', async (req, res) => {
    try {
        const { fileId } = req.params;
        const query = `SELECT Filename, BlobName FROM Files WHERE Id = @id`;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'DB Connection failed' });

            const request = new Request(query, async (err, rowCount, rows) => {
                connection.close();
                if (err || rowCount === 0) return res.status(404).json({ error: 'File not found' });

                const filename = rows[0][0].value;
                const blobName = rows[0][1].value;

                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                const downloadResponse = await blockBlobClient.download(0);

                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/octet-stream');
                downloadResponse.readableStreamBody.pipe(res);
            });

            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        res.status(500).json({ error: 'Download failed' });
    }
});

// 4. Delete File (From Blob and SQL)
app.delete('/api/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const query = `SELECT BlobName FROM Files WHERE Id = @id`;

        const connection = new Connection(sqlConfig);
        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'DB Connection failed' });

            const request = new Request(query, async (err, rowCount, rows) => {
                if (err || rowCount === 0) {
                    connection.close();
                    return res.status(404).json({ error: 'File not found' });
                }

                const blobName = rows[0][0].value;

                // 1. Delete from Blob Storage
                try {
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    await blockBlobClient.delete();
                } catch (blobErr) {
                    console.warn('Blob delete warning:', blobErr.message);
                }

                // 2. Delete from SQL
                const deleteQuery = `DELETE FROM Files WHERE Id = @id`;
                const deleteRequest = new Request(deleteQuery, (err) => {
                    connection.close();
                    if (err) return res.status(500).json({ error: 'DB Delete failed' });
                    res.json({ success: true, message: 'File deleted from Blob and SQL' });
                });
                deleteRequest.addParameter('id', TYPES.UniqueIdentifier, fileId);
                connection.execSql(deleteRequest);
            });

            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            connection.execSql(request);
        });
        connection.connect();
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// 5. Rename File
app.put('/api/files/:fileId', express.json(), async (req, res) => {
    try {
        const { fileId } = req.params;
        const { filename } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename required' });
        }

        console.log(`✏️  Rename request: ${fileId} → ${filename}`);
        const query = `UPDATE Files SET Filename = @filename, UpdatedAt = GETUTCDATE() WHERE Id = @id`;

        const connection = new Connection(sqlConfig);

        connection.on('connect', (err) => {
            if (err) return res.status(500).json({ error: 'Connection failed' });

            const request = new Request(query, (err) => {
                connection.close();
                if (err) {
                    console.error(`❌ Rename failed: ${err.message}`);
                    return res.status(500).json({ error: 'Update failed' });
                }
                console.log(`✅ File renamed: ${fileId} → ${filename}`);
                res.json({ success: true, message: 'File renamed' });
            });

            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            request.addParameter('filename', TYPES.NVarChar, filename);
            connection.execSql(request);
        });

        connection.connect();
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ error: 'Rename failed' });
    }
});

// 6. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', version: '1.0', storage: 'SQL Database' });
});

// ======= AI ROUTES (GEMINI PRO - DATABASE AWARE WITH BLOB) =======

// Helper to fetch file content from Blob Storage
async function getFileContent(fileId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT Filename, BlobName FROM Files WHERE Id = @id`;
        const connection = new Connection(sqlConfig);
        
        connection.on('connect', (err) => {
            if (err) return reject(err);
            const request = new Request(query, async (err, rowCount, rows) => {
                connection.close();
                if (err || rowCount === 0) return resolve(null);
                
                const filename = rows[0][0].value;
                const blobName = rows[0][1].value;

                try {
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    const downloadResponse = await blockBlobClient.download(0);
                    const body = await streamToText(downloadResponse.readableStreamBody);
                    console.log(`📖 AI analyzing file: ${filename} (${body.length} chars)`);
                    resolve({ filename, text: body });
                } catch (e) {
                    console.error('❌ Blob read error:', e);
                    resolve(null);
                }
            });
            request.addParameter('id', TYPES.UniqueIdentifier, fileId);
            connection.execSql(request);
        });
        connection.connect();
    });
}

// Stream helper
async function streamToText(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
}

const APP_INFO = `
StudyCloud is a premium cloud-based notes manager. 
Features: Secure login, Folder-based organization (Subjects), Multi-format file support, and an AI Study Assistant.
Database: Azure SQL. Backend: Node.js. Hosting: Azure App Service.
`;

// 7. AI Summarize (NOW POWERED BY AZURE AI)
app.post('/api/ai/summarize', verifyToken, async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: 'No file selected' });

        const fileData = await getFileContent(fileId);
        if (!fileData) return res.status(404).json({ error: 'File content not found' });

        const key = process.env.AZURE_LANGUAGE_KEY;
        const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT;

        // Azure Language Service Extractive Summarization (Synchronous call for small/medium text)
        const url = `${endpoint}/language/:analyze-text?api-version=2023-04-01`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "kind": "ExtractiveSummarization",
                "parameters": { "sentenceCount": 3 },
                "analysisInput": {
                    "documents": [
                        { "id": "1", "language": "en", "text": fileData.text.substring(0, 5000) }
                    ]
                }
            })
        });

        const data = await response.json();
        
        if (data.results && data.results.documents && data.results.documents[0]) {
            const summary = data.results.documents[0].sentences.map(s => s.text).join(' ');
            res.json({ summary: "📊 [Azure AI Summary]: " + summary });
        } else {
            console.error('Azure AI Error:', JSON.stringify(data));
            res.status(500).json({ error: 'Azure AI Summarization failed' });
        }
    } catch (error) {
        console.error('Azure AI Summarize error:', error);
        res.status(500).json({ error: 'Azure AI Summarize failed' });
    }
});

// 8. AI Chat (Q&A)
app.post('/api/ai/chat', verifyToken, async (req, res) => {
    try {
        const { fileId, question } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        let context = "The user is asking about the StudyCloud app.";
        if (fileId) {
            const fileData = await getFileContent(fileId);
            if (fileData && fileData.text) {
                context = `ANALYZED DATA FROM DATABASE:\nFile Name: ${fileData.filename}\nNote Content:\n"""\n${fileData.text}\n"""`;
            } else {
                context = "User has selected a note, but it appears to be empty or unreadable.";
            }
        }

        const systemPrompt = `You are the StudyCloud AI Study Assistant. ${APP_INFO}
        
INSTRUCTIONS:
1. If the user asks about their notes, use the "ANALYZED DATA" provided below.
2. If the data is missing, explain that you are ready to analyze their files once they upload text-based notes.
3. Be concise and professional.

${context}

User Question: ${question}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: systemPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            console.error('❌ Gemini Chat Error:', JSON.stringify(data));
            return res.status(500).json({ error: 'AI Chat failed. The response might have been blocked by safety filters.' });
        }

        const answer = data.candidates[0].content.parts[0].text;
        res.json({ answer });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: 'AI Chat failed' });
    }
});

// 9. AI Quiz Generator
app.post('/api/ai/quiz', verifyToken, async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: 'No file selected' });

        const fileData = await getFileContent(fileId);
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Generate 5 MCQs with answers for these notes: ${fileData.filename}\nContent:\n${fileData.text.substring(0, 10000)}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            console.error('❌ Gemini Quiz Error:', JSON.stringify(data));
            return res.status(500).json({ error: 'AI Quiz generation failed.' });
        }

        const quiz = data.candidates[0].content.parts[0].text;
        res.json({ quiz });
    } catch (error) {
        res.status(500).json({ error: 'AI Quiz failed' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and start server
initializeDatabase();

const server = app.listen(port, () => {
    console.log(`✓ StudyCloud API running on port ${port}`);
    console.log(`✓ Storage: SQL Database (centralindia)`);
    console.log(`✓ Frontend: http://localhost:${port}`);

    // Diagnostic logging
    console.log('=== ENVIRONMENT DIAGNOSTIC ===');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    console.log(`PORT: ${process.env.PORT || 'NOT SET'}`);
    console.log(`SQL_SERVER: ${process.env.SQL_SERVER ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`SQL_DATABASE: ${process.env.SQL_DATABASE ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`SQL_USER: ${process.env.SQL_USER ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`SQL_PASSWORD: ${process.env.SQL_PASSWORD ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✓ SET' : '❌ NOT SET'}`);
    console.log('==============================');
});

server.on('error', (err) => {
    console.error('❌ SERVER ERROR:', err.message);
    console.error('Stack:', err.stack);
});
