# 📊 Database Schema & Query Guide

Complete reference for StudyCloud database structure

---

## **📋 Database Overview**

**Database Name:** `StudyNotesDB`  
**Server:** `your-sql-server.database.windows.net`  
**Type:** Azure SQL Database (Cloud)  
**Authentication:** SQL Server Auth (Username/Password)  
**Encryption:** TLS 1.2+  
**Backup:** Automatic (35-day retention)

---

## **🗂️ Tables**

### **Table 1: Users**

Stores user account information

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

#### Column Reference

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `Id` | UNIQUEIDENTIFIER | User ID (GUID) | PK, DEFAULT NEWID() |
| `Email` | NVARCHAR(255) | Email address | UNIQUE, NOT NULL |
| `Username` | NVARCHAR(255) | Display name | NOT NULL |
| `Password` | NVARCHAR(MAX) | Hashed password (bcrypt) | NOT NULL |
| `IsVerified` | BIT | Email verified (0=no, 1=yes) | DEFAULT 0 |
| `VerificationToken` | NVARCHAR(MAX) | Email verification token | NULL unless pending |
| `ResetToken` | NVARCHAR(MAX) | Password reset token | NULL unless requested |
| `ResetTokenExpiry` | DATETIME | When reset token expires | NULL or valid datetime |
| `CreatedAt` | DATETIME | Account creation time | DEFAULT GETUTCDATE() |
| `UpdatedAt` | DATETIME | Last updated time | DEFAULT GETUTCDATE() |

#### Indexes

```sql
-- Primary Key Index (automatic)
CREATE UNIQUE INDEX PK_Users ON Users(Id);

-- Email Lookup (fast login)
CREATE UNIQUE INDEX UX_Users_Email ON Users(Email);

-- Search by username (optional)
CREATE INDEX IX_Users_Username ON Users(Username);

-- Find verified users
CREATE INDEX IX_Users_IsVerified ON Users(IsVerified);
```

#### Sample Data

```sql
INSERT INTO Users (Email, Username, Password, IsVerified) 
VALUES (
  'john@example.com',
  'john_doe',
  '$2a$10$salt...hashed_password_here...',
  1
);
```

#### Example Queries

```sql
-- Find user by email
SELECT * FROM Users 
WHERE Email = 'john@example.com';

-- Find user by ID
SELECT * FROM Users 
WHERE Id = '550e8400-e29b-41d4-a716-446655440000';

-- Get all verified users
SELECT * FROM Users 
WHERE IsVerified = 1
ORDER BY CreatedAt DESC;

-- Count users created today
SELECT COUNT(*) FROM Users 
WHERE CAST(CreatedAt AS DATE) = CAST(GETUTCDATE() AS DATE);

-- Find users by email domain
SELECT * FROM Users 
WHERE Email LIKE '%@gmail.com';

-- Find users not yet verified
SELECT Email, Username, CreatedAt FROM Users 
WHERE IsVerified = 0
ORDER BY CreatedAt DESC;

-- Find users with pending password reset
SELECT * FROM Users 
WHERE ResetToken IS NOT NULL 
AND ResetTokenExpiry > GETUTCDATE();
```

---

### **Table 2: Files**

Stores uploaded study materials

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

#### Column Reference

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `Id` | UNIQUEIDENTIFIER | File ID (GUID) | PK, DEFAULT NEWID() |
| `UserId` | UNIQUEIDENTIFIER | Owner user ID | FK → Users(Id), NOT NULL |
| `Subject` | NVARCHAR(MAX) | Category/folder name | NOT NULL |
| `Filename` | NVARCHAR(MAX) | Display filename | NOT NULL |
| `FileData` | VARBINARY(MAX) | Binary file content | NOT NULL |
| `FileSize` | INT | File size in bytes | NOT NULL |
| `CreatedAt` | DATETIME | Upload time | DEFAULT GETUTCDATE() |
| `UpdatedAt` | DATETIME | Last modified time | DEFAULT GETUTCDATE() |

#### Indexes

```sql
-- Primary Key Index (automatic)
CREATE UNIQUE INDEX PK_Files ON Files(Id);

-- Find files by user (fast query)
CREATE INDEX IX_Files_UserId ON Files(UserId);

-- Find files by subject
CREATE INDEX IX_Files_Subject ON Files(Subject);

-- Composite index for common query
CREATE INDEX IX_Files_UserId_Subject ON Files(UserId, Subject);

-- Full-text search on filename (optional)
CREATE FULLTEXT INDEX ON Files(Filename)
WITH CHANGE_TRACKING = AUTO;
```

#### Sample Data

```sql
INSERT INTO Files (UserId, Subject, Filename, FileData, FileSize)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Mathematics',
  'Calculus_Chapter_5.pdf',
  0x89504e47..., -- binary PDF data
  2048576
);
```

#### Example Queries

```sql
-- Get all files for a user
SELECT * FROM Files 
WHERE UserId = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY CreatedAt DESC;

-- Get files by subject
SELECT * FROM Files 
WHERE UserId = '550e8400-e29b-41d4-a716-446655440000'
AND Subject = 'Mathematics'
ORDER BY Filename;

-- Get file by ID
SELECT * FROM Files 
WHERE Id = '550e8400-e29b-41d4-a716-446655440001';

-- Find large files (> 10MB)
SELECT Filename, Subject, FileSize, CreatedAt FROM Files 
WHERE FileSize > 10485760
ORDER BY FileSize DESC;

-- Count files per subject
SELECT Subject, COUNT(*) as FileCount, SUM(FileSize) as TotalSize
FROM Files 
WHERE UserId = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY Subject
ORDER BY FileCount DESC;

-- Find recently modified files
SELECT Filename, Subject, UpdatedAt FROM Files 
WHERE UserId = '550e8400-e29b-41d4-a716-446655440000'
AND UpdatedAt > DATEADD(DAY, -30, GETUTCDATE())
ORDER BY UpdatedAt DESC;

-- Find duplicate files (same user, same filename)
SELECT Filename, COUNT(*) as Count
FROM Files 
WHERE UserId = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY Filename
HAVING COUNT(*) > 1;

-- Get user and their file count
SELECT 
  u.Username,
  COUNT(f.Id) as FileCount,
  SUM(f.FileSize) as TotalStorageUsed
FROM Users u
LEFT JOIN Files f ON u.Id = f.UserId
GROUP BY u.Id, u.Username
ORDER BY FileCount DESC;

-- Files uploaded in last 24 hours
SELECT * FROM Files 
WHERE CreatedAt > DATEADD(HOUR, -24, GETUTCDATE())
ORDER BY CreatedAt DESC;
```

---

## **🔗 Relationships**

```
Users (1) ──────── (Many) Files
  ↓
Every file has exactly ONE owner (UserId)
Every user can have ZERO or MORE files
```

**Example:**
```
User: john@example.com (Id: 550e8400-e29b-41d4-a716-446655440000)
  ├── File 1: Calculus_Chapter_5.pdf (Subject: Mathematics)
  ├── File 2: Physics_Notes.docx (Subject: Physics)
  ├── File 3: History_Essay.docx (Subject: History)
  └── File 4: Biology_Lab_Report.pdf (Subject: Biology)
```

---

## **📊 Useful Aggregate Queries**

### Storage Usage Report
```sql
SELECT 
  u.Username,
  COUNT(f.Id) as FileCount,
  SUM(f.FileSize) as TotalBytes,
  CAST(ROUND(SUM(f.FileSize) / 1024.0 / 1024.0, 2) AS NVARCHAR) + ' MB' as TotalMB
FROM Users u
LEFT JOIN Files f ON u.Id = f.UserId
GROUP BY u.Id, u.Username
ORDER BY SUM(f.FileSize) DESC;
```

### User Activity Report
```sql
SELECT 
  u.Username,
  u.Email,
  u.CreatedAt as SignupDate,
  COUNT(f.Id) as FileCount,
  MAX(f.CreatedAt) as LastUpload
FROM Users u
LEFT JOIN Files f ON u.Id = f.UserId
GROUP BY u.Id, u.Username, u.Email, u.CreatedAt
ORDER BY COUNT(f.Id) DESC;
```

### Storage by Subject
```sql
SELECT 
  Subject,
  COUNT(*) as FileCount,
  SUM(FileSize) as TotalSize,
  CAST(ROUND(AVG(CAST(FileSize AS FLOAT)), 0) AS INT) as AvgSize
FROM Files
GROUP BY Subject
ORDER BY TotalSize DESC;
```

### Monthly Upload Trends
```sql
SELECT 
  YEAR(CreatedAt) as Year,
  MONTH(CreatedAt) as Month,
  COUNT(*) as FileCount,
  SUM(FileSize) as TotalBytes
FROM Files
GROUP BY YEAR(CreatedAt), MONTH(CreatedAt)
ORDER BY Year DESC, Month DESC;
```

---

## **🔒 Data Integrity Constraints**

### Foreign Key Constraint
```sql
-- Prevents orphaned files (files without users)
ALTER TABLE Files
ADD CONSTRAINT FK_Files_Users
FOREIGN KEY (UserId) REFERENCES Users(Id);

-- ON DELETE CASCADE - automatically delete user's files when user deleted
-- ON DELETE SET NULL - set UserId to NULL (not used here for data protection)
```

### Unique Constraints
```sql
-- Only one user per email
ALTER TABLE Users
ADD CONSTRAINT UQ_Users_Email UNIQUE (Email);
```

---

## **📈 Performance Tuning**

### Query Statistics
```sql
-- View index usage
SELECT 
  OBJECT_NAME(i.object_id) as TableName,
  i.name as IndexName,
  s.seeks,
  s.scans,
  s.lookups,
  s.updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s 
  ON i.object_id = s.object_id 
  AND i.index_id = s.index_id
WHERE database_id = DB_ID()
ORDER BY (s.seeks + s.scans + s.lookups) DESC;
```

### Missing Indexes
```sql
-- Find queries needing indexes
SELECT 
  d.equality_columns,
  d.inequality_columns,
  d.included_columns,
  s.user_seeks,
  s.user_scans,
  s.user_lookups
FROM sys.dm_db_missing_index_details d
INNER JOIN sys.dm_db_missing_index_groups_stats s 
  ON d.index_handle = s.index_handle
ORDER BY (s.user_seeks + s.user_scans + s.user_lookups) DESC;
```

### Slow Queries
```sql
-- Find slow queries
SELECT 
  qt.text,
  qs.execution_count,
  qs.total_elapsed_time / 1000000 as TotalTimeMs,
  qs.total_elapsed_time / qs.execution_count / 1000 as AvgTimeMs
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
WHERE qs.total_elapsed_time / qs.execution_count > 1000000 -- >1 second
ORDER BY qs.total_elapsed_time DESC;
```

---

## **🗑️ Data Cleanup Queries**

### Delete Old Unverified Users (>30 days)
```sql
DELETE FROM Users 
WHERE IsVerified = 0 
AND CreatedAt < DATEADD(DAY, -30, GETUTCDATE());
```

### Delete Expired Password Reset Tokens
```sql
UPDATE Users 
SET ResetToken = NULL, ResetTokenExpiry = NULL
WHERE ResetTokenExpiry < GETUTCDATE();
```

### Delete Files Larger Than 100MB
```sql
DELETE FROM Files 
WHERE FileSize > 104857600;
```

### Archive Old Files (Soft Delete)
```sql
-- First add a column
ALTER TABLE Files ADD IsDeleted BIT DEFAULT 0;

-- Then soft-delete
UPDATE Files 
SET IsDeleted = 1 
WHERE CreatedAt < DATEADD(YEAR, -1, GETUTCDATE());

-- Query active files only
SELECT * FROM Files WHERE IsDeleted = 0;
```

---

## **🔐 Backup & Recovery**

### Create Manual Backup
```sql
-- Azure handles backups automatically
-- But you can export data

-- Backup Users table
SELECT * 
INTO Users_Backup_2024_04_06
FROM Users;

-- Backup Files table
SELECT * 
INTO Files_Backup_2024_04_06
FROM Files;
```

### Point-in-Time Restore
Done through Azure Portal:
1. SQL Server → Database → Restore
2. Select point-in-time
3. Choose backup retention point (up to 35 days)

---

## **🔍 Troubleshoot Common Issues**

### Issue: "Cannot find file"
```sql
-- Verify file exists
SELECT * FROM Files WHERE Id = 'file-id-here';

-- Check if user owns file
SELECT f.* FROM Files f
WHERE f.Id = 'file-id-here'
AND f.UserId = 'user-id-here';
```

### Issue: "User not found during login"
```sql
-- Check if user exists
SELECT * FROM Users WHERE Email = 'user@example.com';

-- Check if email is verified
SELECT IsVerified FROM Users WHERE Email = 'user@example.com';
```

### Issue: "Storage quota exceeded"
```sql
-- Check total storage per user
SELECT 
  SUM(FileSize) / 1024 / 1024 as UsedMB,
  COUNT(*) as FileCount
FROM Files 
WHERE UserId = 'user-id-here';

-- Find largest files
SELECT TOP 10 Filename, FileSize 
FROM Files 
WHERE UserId = 'user-id-here'
ORDER BY FileSize DESC;
```

### Issue: "Database connection timeout"
```
Check:
1. Connection string correct
2. Firewall rules allow your IP
3. Database is "Online" (not paused)
4. Connection pool not exhausted
5. Network not blocked
```

---

## **📝 Schema Migration Example**

### Add New Column (User Preferences)
```sql
-- Add column
ALTER TABLE Users 
ADD Theme NVARCHAR(20) DEFAULT 'light';

-- Add index
CREATE INDEX IX_Users_Theme ON Users(Theme);

-- Update existing users
UPDATE Users SET Theme = 'light' WHERE Theme IS NULL;

-- Make NOT NULL
ALTER TABLE Users 
ALTER COLUMN Theme NVARCHAR(20) NOT NULL;
```

### Drop Old Column
```sql
-- Check dependencies first
SELECT * FROM sys.dm_sql_referenced_entities 
WHERE referenced_entity_name = 'Users'
AND referencing_entity_name LIKE '%ResetToken%';

-- Drop column
ALTER TABLE Users DROP COLUMN ResetToken;
```

---

## **🔄 Connection String Reference**

### Local Development (SQL Server)
```
Server=localhost;
Database=StudyNotesDB;
User Id=sa;
Password=YourPassword;
TrustServerCertificate=true;
```

### Azure SQL Database
```
Server=tcp:your-sql-server.database.windows.net,1433;
Initial Catalog=your-database-name;
User Id=your-sql-username@your-sql-server;
Password=YourPassword;
Encrypt=true;
Connection Timeout=30;
```

### Connection String in Code (Node.js)
```javascript
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
    connectionTimeout: 60000
  }
};

const connection = new Connection(sqlConfig);
```

---

## **📚 Useful Resources**

- [Azure SQL Documentation](https://learn.microsoft.com/azure/sql-database/)
- [T-SQL Reference](https://learn.microsoft.com/sql/t-sql/language-reference)
- [SQL Server Management Studio](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms)
- [Azure Data Studio](https://learn.microsoft.com/sql/azure-data-studio/download-azure-data-studio)

---

**Version:** 1.0.0  
**Last Updated:** April 6, 2026
