# StudyCloud 📚

**A cloud-based study notes manager powered by Azure SQL Database and Node.js**

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Deployment to Azure](#deployment-to-azure)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**StudyCloud** is a web application that allows students and professionals to:
- Create an account and verify email
- Upload study materials (PDFs, documents, images, etc.)
- Organize notes by subject/folder
- View and download stored files
- Manage multiple documents in the cloud

The backend is built with **Express.js** and uses **Azure SQL Database** for secure data storage. The frontend is a responsive HTML/CSS/JavaScript interface.

**Live URL:** `https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net`

---

## ✨ Features

### Authentication & Security
- ✅ User registration with email verification
- ✅ Secure login with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Email verification via Gmail SMTP
- ✅ Password reset functionality (with token expiry)
- ✅ Protected API endpoints with middleware

### File Management
- ✅ Upload files up to 50MB
- ✅ Organize files by subject/folder
- ✅ View files online
- ✅ Download files
- ✅ Delete files
- ✅ Rename/Edit file metadata
- ✅ Database-backed file storage (no external Blob Storage needed)

### User Interface
- ✅ Clean, modern dashboard
- ✅ Dark/Light theme toggle
- ✅ Responsive design (mobile-friendly)
- ✅ Real-time file listings
- ✅ Interactive upload progress

### Backend
- ✅ RESTful API architecture
- ✅ CORS enabled for cross-origin requests
- ✅ Error handling & validation
- ✅ Health check endpoint
- ✅ Automatic database initialization

---

## 🛠 Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 22 | Runtime environment |
| **Express.js** | 4.18.2 | Web framework |
| **Tedious** | 16.6.1 | Azure SQL connector |
| **JWT (jsonwebtoken)** | 9.0.3 | Authentication tokens |
| **bcryptjs** | 3.0.3 | Password hashing |
| **Nodemailer** | 8.0.4 | Email service |
| **Multer** | 1.4.5 | File upload handling |
| **CORS** | 2.8.5 | Cross-origin requests |
| **UUID** | 9.0.1 | Unique ID generation |

### Database
- **Azure SQL Database** (Cloud)
- **Tables:** Users, Files
- **Authentication:** SQL Server credentials
- **Data Type Support:** VARBINARY for file storage

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling  
- **Vanilla JavaScript** - Interactivity
- **JSZip** - Multiple file compression (optional)

### Deployment
- **Azure App Service** (Web hosting)
- **GitHub Actions** (CI/CD)
- **Gmail SMTP** (Email service)

---

## 📁 Project Structure

```
CC project/
├── server.js                 # Main Express server & API endpoints
├── package.json             # Node.js dependencies
├── package-lock.json        # Locked versions
├── .env                     # Environment variables (secrets)
├── .gitignore              # Git ignore rules
│
├── Frontend Files:
├── index.html              # Main dashboard
├── auth.html               # Login/Register page
├── verify-email.html       # Email verification page
├── viewer.html             # File viewer
├── styles.css              # Global styling
│
├── Deployment:
├── script-azure.js         # Azure deployment helper
├── web.config              # IIS configuration for Azure
│
└── deploy.zip              # Deployment package
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js 22+** installed
- **npm** or **yarn** package manager
- **Azure Account** (for cloud deployment)
- **GitHub Account** (for CI/CD)

### Local Development Setup

#### 1. Clone or Download Project
```bash
cd "CC project"
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create/edit `.env` file with your Azure credentials:
```env
SQL_SERVER=your-sql-server.database.windows.net
SQL_DATABASE=your-database-name
SQL_USER=your-sql-username
SQL_PASSWORD=your-sql-password
NODE_ENV=development
PORT=3000
STORAGE_METHOD=sql
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
VERIFICATION_URL=http://localhost:3000/verify-email.html
JWT_SECRET=your-secret-key
```

#### 4. Connect to Azure SQL Database
- Open **Azure Data Studio** or **SQL Server Management Studio**
- Connect using credentials from `.env`:
  - Server: `your-sql-server.database.windows.net`
  - Username: `your-sql-username`
  - Password: `your-sql-password`
  - Database: `your-database-name`
- Tables will be auto-created on server startup

#### 5. Run Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

#### 6. Access Application
- Open browser: `http://localhost:3000`
- Register new account
- Check email for verification link
- Upload and manage study materials

---

## 🔐 Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `SQL_SERVER` | `your-sql-server.database.windows.net` | Azure SQL Server hostname |
| `SQL_DATABASE` | `your-database-name` | Database name |
| `SQL_USER` | `your-sql-username` | SQL username |
| `SQL_PASSWORD` | `your-sql-password` | SQL password (CHANGE IN PRODUCTION!) |
| `NODE_ENV` | `production` or `development` | Environment mode |
| `PORT` | `3000` or `8080` | Server port |
| `STORAGE_METHOD` | `sql` | Where to store files (sql/blob) |
| `EMAIL_SERVICE` | `gmail` | SMTP provider |
| `EMAIL_USER` | `your-email@gmail.com` | Sender email |
| `EMAIL_PASSWORD` | `your-app-password` | Gmail app password |
| `VERIFICATION_URL` | `https://your-app.azurewebsites.net/verify-email.html` | Email verification link |
| `JWT_SECRET` | `your-secret-key` | Token signing key (CHANGE IN PRODUCTION!) |

### ⚠️ Security Reminders
- **NEVER** commit `.env` to version control
- Use strong random string for `JWT_SECRET` in production
- Rotate `SQL_PASSWORD` regularly
- Use Azure Key Vault in production instead of `.env`

---

## 📡 API Endpoints

### Authentication Endpoints

#### **POST** `/api/auth/signup`
Register a new user
```json
REQUEST:
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securePass123"
}

RESPONSE (200):
{
  "message": "Signup successful! Please verify your email.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

#### **POST** `/api/auth/signin`
Login user
```json
REQUEST:
{
  "email": "user@example.com",
  "password": "securePass123"
}

RESPONSE (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "isVerified": true
  }
}
```

#### **POST** `/api/auth/verify-email`
Verify email with token from link
```json
REQUEST:
{
  "token": "verification-token-from-email"
}

RESPONSE (200):
{
  "message": "Email verified successfully!"
}
```

#### **POST** `/api/auth/resend-verification`
Resend verification email
```json
REQUEST:
{
  "email": "user@example.com"
}

RESPONSE (200):
{
  "message": "Verification email sent!"
}
```

#### **GET** `/api/auth/verify`
Verify JWT token (protected)
```
HEADERS: Authorization: Bearer <token>

RESPONSE (200):
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

### File Management Endpoints

#### **POST** `/api/files/upload`
Upload a file (protected)
```
HEADERS: 
  - Authorization: Bearer <token>
  - Content-Type: multipart/form-data

BODY:
  - file: <binary_file>
  - subject: "Mathematics"
  - filename: "Calculus_Notes"

RESPONSE (200):
{
  "message": "File uploaded successfully",
  "file": {
    "id": "uuid",
    "filename": "Calculus_Notes",
    "subject": "Mathematics",
    "fileSize": 2048576,
    "createdAt": "2024-04-06T10:30:00Z"
  }
}
```

#### **GET** `/api/files`
Get all files for user (with optional subject filter)
```
QUERY PARAMS: ?subject=Mathematics (optional)

RESPONSE (200):
{
  "files": [
    {
      "id": "uuid",
      "filename": "Calculus_Notes",
      "subject": "Mathematics",
      "fileSize": 2048576,
      "createdAt": "2024-04-06T10:30:00Z"
    }
  ]
}
```

#### **GET** `/api/files/:fileId/view`
View file (stream/display in browser)
```
RESPONSE: File binary data with proper content-type
```

#### **GET** `/api/files/:fileId/download`
Download file
```
RESPONSE: File download with original filename
```

#### **PUT** `/api/files/:fileId`
Update file metadata
```json
REQUEST:
{
  "filename": "Calculus_Advanced_Notes",
  "subject": "Advanced Mathematics"
}

RESPONSE (200):
{
  "message": "File updated",
  "file": { updated object }
}
```

#### **DELETE** `/api/files/:fileId`
Delete file
```
RESPONSE (200):
{
  "message": "File deleted successfully"
}
```

---

### System Endpoints

#### **GET** `/api/health`
Health check
```
RESPONSE (200):
{
  "status": "OK",
  "timestamp": "2024-04-06T10:30:00Z"
}
```

#### **GET** `/`
Serve index.html (main app)
```
RESPONSE: index.html
```

---

## 📊 Database Schema

### Users Table
```sql
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
```

**Indexes:**
- PRIMARY KEY on `Id`
- UNIQUE on `Email`

**Columns:**
- `Id` - User unique identifier (GUID)
- `Email` - User email (unique)
- `Username` - Display name
- `Password` - Hashed password (bcrypt)
- `IsVerified` - Email verification status (0=no, 1=yes)
- `VerificationToken` - Token for email verification
- `ResetToken` - Password reset token
- `ResetTokenExpiry` - When reset token expires
- `CreatedAt` - Account creation timestamp
- `UpdatedAt` - Last update timestamp

---

### Files Table
```sql
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
```

**Indexes:**
- PRIMARY KEY on `Id`
- FOREIGN KEY on `UserId`

**Columns:**
- `Id` - File unique identifier
- `UserId` - Owner user ID (foreign key)
- `Subject` - Category/folder name
- `Filename` - Displayed filename
- `FileData` - Binary file content
- `FileSize` - File size in bytes
- `CreatedAt` - Upload timestamp
- `UpdatedAt` - Last modification timestamp

---

## 🌐 Deployment to Azure

### Prerequisites
- Azure subscription with active resources
- GitHub repository with your code
- Azure CLI installed (optional)

### Step-by-Step Deployment

#### **Step 1: Prepare Code for Azure**
```bash
# Ensure all dependencies are in package.json
npm install

# Update .env with Azure values
# VERIFICATION_URL=https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net/verify-email.html
```

#### **Step 2: Create GitHub Repository**
```bash
git init
git add .
git commit -m "Initial StudyCloud commit"
git branch -M main
git remote add origin https://github.com/yourusername/studycloud.git
git push -u origin main
```

#### **Step 3: Link to Azure App Service**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Your App Service (`studycloud-app-...`)
3. **Deployment Center** → **GitHub** → Authorize & Connect
4. Select Repository & Branch (`main`)
5. Azure automatically creates GitHub Actions workflow

#### **Step 4: Configure Azure App Service Settings**
1. App Service → **Configuration** 
2. Add **Application settings** (all `.env` variables):
   ```
   SQL_SERVER = your-sql-server.database.windows.net
   SQL_DATABASE = your-database-name
   SQL_USER = your-sql-username
   SQL_PASSWORD = your-sql-password
   NODE_ENV = production
   PORT = 8080
   STORAGE_METHOD = sql
   EMAIL_SERVICE = gmail
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASSWORD = your-app-password
   VERIFICATION_URL = https://your-app.azurewebsites.net/verify-email.html
   JWT_SECRET = [Strong-Random-Secret-Here]
   ```
3. Click **Save**

#### **Step 5: Deploy**
- Push to `main` branch:
  ```bash
  git push origin main
  ```
- GitHub Actions automatically builds and deploys
- Monitor in **Deployment Center** → **Actions**

#### **Step 6: Verify Deployment**
- Visit: `https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net`
- Test signup, email verification, and file upload
- Check **Log stream** for errors if issues occur

---

## 🔒 Security

### Current Implementation
- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ JWT token-based authentication
- ✅ Email verification required before access
- ✅ CORS enabled for frontend only
- ✅ SQL injection prevention (parameterized queries via Tedious)
- ✅ File size limit: 50MB per file
- ✅ Timeout: 120 seconds for uploads

### Security Recommendations

#### 1. **Update JWT Secret** (Critical)
```env
OLD: JWT_SECRET=your-secret-key
NEW: JWT_SECRET=kvfjk9@8dhsk!2kjhsdkj$%^&*()_+={}[]|:;<>?,./
```
Generate using: `require('crypto').randomBytes(32).toString('hex')`

#### 2. **Use Azure Key Vault** (Production)
```javascript
// Instead of .env file
const { SecretClient } = require("@azure/identity");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  `https://studycloud-kv.vault.azure.net/`,
  credential
);

const secret = await client.getSecret("jwt-secret");
```

#### 3. **Enable HTTPS Only**
- Azure App Service → TLS/SSL settings → HTTPS only

#### 4. **Rate Limiting** (Recommended)
```bash
npm install express-rate-limit
```
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);
```

#### 5. **SQL Firewall Rules**
- Allow only Azure App Service IP
- Block public access if not needed

#### 6. **CORS Whitelist**
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net'],
  credentials: true
}));
```

#### 7. **Helmet for HTTP Headers**
```bash
npm install helmet
```
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 🐛 Troubleshooting

### Common Issues

#### **1. "Cannot connect to SQL Server"**
```
Error: connect ENOTFOUND studycloud-sql-new.database.windows.net

Solution:
- Check SQL_SERVER in .env
- Verify firewall rules allow your IP
- Check username/password
- Ensure database exists
```

#### **2. "Email not sending"**
```
Error: 550 5.7.1 Invalid credentials for mail.smtp.com

Solution:
- Create Gmail App Password (not regular password)
- Enable 2FA on Gmail account
- Update EMAIL_USER and EMAIL_PASSWORD in .env
- Check EMAIL_SERVICE = gmail
```

#### **3. "File uploads fail"**
```
Error: 413 Payload Too Large

Solution:
- Increase limit in server.js:
  app.use(express.json({ limit: '100mb' }));
  upload.single('file') limits { fileSize: 100 * 1024 * 1024 }
- Check Azure App Service disk quota
```

#### **4. "JWT token invalid"**
```
Error: invalid token / token expired

Solution:
- User must login again to get new token
- Check JWT_SECRET matches on server
- Token expires after session
```

#### **5. "Verification link expired"**
```
Solution:
- Resend verification email via /api/auth/resend-verification
- Token valid for 24 hours
- User can still signup with same email
```

#### **6. "CORS Error in browser"**
```
Error: Access to XMLHttpRequest blocked by CORS policy

Solution:
- Ensure CORS middleware enabled: app.use(cors())
- Check frontend is on same domain or whitelisted
- Add CORS headers in responses
```

---

## 📝 Notes

### File Storage Strategy
- **Current:** SQL Database (VARBINARY column)
- **Pros:** No additional service costs, included in SQL subscription
- **Cons:** Database size limited (depending on tier)
- **Alternative:** Azure Blob Storage (requires higher subscription tier)

### Database Connection
- Uses **Tedious** library (Node.js SQL driver)
- Connection pooling: Automatic via App Service
- Timeout: 120 seconds for large queries
- Encryption: TLS 1.2+

### Scaling Considerations
- **Users:** No limit (Azure AD integration possible)
- **File Storage:** Limited by SQL Database tier
- **Concurrent Users:** Depends on App Service tier (B1, B2, B3, S1, etc.)
- **Recommended for 100+ users:** S1 or higher tier

---

## 📚 Additional Resources

- [Azure SQL Documentation](https://learn.microsoft.com/azure/sql-database/)
- [Express.js Guide](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Security Guidelines](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

---

## 📄 License

© 2024 StudyCloud. All rights reserved.

---

## 👥 Support & Feedback

For issues or suggestions:
1. Check **Troubleshooting** section
2. Review logs in Azure Portal → Log stream
3. Test endpoints using Postman/Thunder Client

**Created:** April 2024  
**Last Updated:** April 6, 2026  
**Version:** 1.0.0
