# 📡 API Documentation

Complete reference for all StudyCloud API endpoints.

---

## **Base URL**
```
Development:  http://localhost:3000
Production:   https://your-app.azurewebsites.net
```

---

## **Authentication Endpoints**

### 1. Register New User
**Endpoint:** `POST /api/auth/signup`

**Description:** Create a new user account and send verification email

**Request:**
```json
{
  "email": "student@example.com",
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "message": "Signup successful! Please verify your email.",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "username": "john_doe"
  }
}
```

**Error Responses:**
- `400` - Email already exists
- `400` - Missing fields (email, username, password)
- `400` - Invalid email format
- `500` - Server error

---

### 2. Login User
**Endpoint:** `POST /api/auth/signin`

**Description:** Authenticate user and receive JWT token

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "username": "john_doe",
    "isVerified": true
  }
}
```

**Error Responses:**
- `401` - Invalid email or password
- `401` - Email not verified
- `400` - Missing email/password
- `404` - User not found

**Token Usage:**
All protected endpoints require this JWT in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Verify Email Address
**Endpoint:** `POST /api/auth/verify-email`

**Description:** Verify user email using token from verification link

**Request:**
```json
{
  "token": "verification-token-from-email-link"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully!",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "isVerified": true
  }
}
```

**Error Responses:**
- `400` - Invalid or expired token
- `404` - User not found
- `400` - Email already verified

**Token Validity:** 24 hours from signup

---

### 4. Resend Verification Email
**Endpoint:** `POST /api/auth/resend-verification`

**Description:** Send new verification email if expired

**Request:**
```json
{
  "email": "student@example.com"
}
```

**Response (200):**
```json
{
  "message": "Verification email sent! Check your inbox.",
  "expiresIn": "24 hours"
}
```

**Error Responses:**
- `404` - User not found
- `400` - Email already verified
- `500` - Email sending failed

---

### 5. Verify JWT Token (Protected)
**Endpoint:** `GET /api/auth/verify`

**Description:** Validate current JWT token

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "username": "john_doe"
  }
}
```

**Error Responses:**
- `401` - Invalid or missing token
- `401` - Token expired

---

## **File Management Endpoints**

### 6. Upload File
**Endpoint:** `POST /api/files/upload`

**Description:** Upload a file to the database

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
file: <binary_file_data> (max 50MB)
subject: "Mathematics"
filename: "Calculus_Chapter_5"
```

**Response (201):**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "filename": "Calculus_Chapter_5",
    "subject": "Mathematics",
    "fileSize": 2048576,
    "createdAt": "2024-04-06T10:30:00Z",
    "updatedAt": "2024-04-06T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - No file provided
- `400` - File too large (>50MB)
- `401` - Unauthorized (invalid token)
- `500` - Database error

**Supported File Types:**
PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, TXT, ZIP, etc.

---

### 7. Get All Files
**Endpoint:** `GET /api/files`

**Description:** Retrieve all files for authenticated user (optionally filtered by subject)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN> (optional - returns public files if not provided)
```

**Query Parameters:**
- `subject` (optional) - Filter by subject/folder name
- Example: `/api/files?subject=Mathematics`

**Response (200):**
```json
{
  "count": 3,
  "files": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "filename": "Calculus_Chapter_5",
      "subject": "Mathematics",
      "fileSize": 2048576,
      "createdAt": "2024-04-06T10:30:00Z",
      "updatedAt": "2024-04-06T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "filename": "Physics_Notes",
      "subject": "Physics",
      "fileSize": 1024000,
      "createdAt": "2024-04-05T14:20:00Z",
      "updatedAt": "2024-04-05T14:20:00Z"
    }
  ]
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Database error

---

### 8. View File
**Endpoint:** `GET /api/files/:fileId/view`

**Description:** Stream file for inline viewing (opens in browser)

**Parameters:**
- `fileId` (path) - Unique file identifier (UUID)

**Response:**
- HTTP 200 with file binary data
- Content-Type: Automatically detected (application/pdf, image/png, etc.)
- Content-Disposition: inline

**Example:**
```
GET /api/files/550e8400-e29b-41d4-a716-446655440001/view
```

**Error Responses:**
- `404` - File not found
- `401` - Unauthorized
- `500` - File read error

---

### 9. Download File
**Endpoint:** `GET /api/files/:fileId/download`

**Description:** Download file with original filename

**Parameters:**
- `fileId` (path) - Unique file identifier (UUID)

**Response:**
- HTTP 200 with file binary data
- Content-Type: application/octet-stream
- Content-Disposition: attachment; filename="original_name.ext"

**Example:**
```
GET /api/files/550e8400-e29b-41d4-a716-446655440001/download
```

**Browser Behavior:** Triggers download dialog

**Error Responses:**
- `404` - File not found
- `401` - Unauthorized
- `500` - File read error

---

### 10. Update File Metadata
**Endpoint:** `PUT /api/files/:fileId`

**Description:** Rename or change subject of existing file

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Parameters:**
- `fileId` (path) - Unique file identifier (UUID)

**Request Body:**
```json
{
  "filename": "Calculus_Advanced_Chapter_5",
  "subject": "Advanced Mathematics"
}
```

**Response (200):**
```json
{
  "message": "File updated successfully",
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "filename": "Calculus_Advanced_Chapter_5",
    "subject": "Advanced Mathematics",
    "fileSize": 2048576,
    "createdAt": "2024-04-06T10:30:00Z",
    "updatedAt": "2024-04-06T10:45:00Z"
  }
}
```

**Error Responses:**
- `400` - No fields to update
- `404` - File not found
- `401` - Unauthorized / Not file owner
- `500` - Update failed

---

### 11. Delete File
**Endpoint:** `DELETE /api/files/:fileId`

**Description:** Permanently delete a file

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Parameters:**
- `fileId` (path) - Unique file identifier (UUID)

**Response (200):**
```json
{
  "message": "File deleted successfully",
  "fileId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Error Responses:**
- `404` - File not found
- `401` - Unauthorized / Not file owner
- `500` - Delete failed

**Important:** Deletion is permanent and cannot be undone

---

## **System Endpoints**

### 12. Health Check
**Endpoint:** `GET /api/health`

**Description:** Verify server is running and responsive

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-04-06T10:30:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

### 13. Serve Index Page
**Endpoint:** `GET /`

**Description:** Serve main application page

**Response:** HTML index page

---

## **Error Handling**

### Standard Error Response Format
All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-04-06T10:30:00Z"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |
| 503 | Service Unavailable |

---

## **Testing with cURL**

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Pass123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123"}'
```

### Upload File
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "subject=Mathematics" \
  -F "filename=Notes"
```

### Get Files
```bash
curl -X GET "http://localhost:3000/api/files?subject=Mathematics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Download File
```bash
curl -X GET http://localhost:3000/api/files/{fileId}/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output filename.pdf
```

---

## **Testing with Postman**

1. **Create New Request** → Select method (GET, POST, etc.)
2. **Set URL** → `http://localhost:3000/api/auth/signup`
3. **Headers** → Add `Content-Type: application/json`
4. **Body** → Select "raw" → JSON → Add request body
5. **Send** → View response

**Postman Collection:** (Can be imported)
```json
{
  "info": {
    "name": "StudyCloud API",
    "schema": "https://schema.getpostman.com/collection"
  }
}
```

---

## **Rate Limiting**

Currently not enforced, but recommended to add:
- Max 100 requests per 15 minutes per IP
- 10 signup attempts per hour per IP
- 5 login attempts per minute per IP

---

## **Authentication Token Format**

JWT tokens have 3 parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTcxMjM5NjYwMCwiZXhwIjoxNzEyNDgzMDAwfQ.abcdefg123456789
```

**Decode using:** https://jwt.io/

Token contains:
- **Header:** Algorithm (HS256) and type (JWT)
- **Payload:** User ID, issued time, expiry
- **Signature:** Verification hash

**Token Expiry:** Configurable (default: 24 hours)

---

## **CORS Policy**

Requests from different domains require CORS headers. Current setup:
```javascript
app.use(cors())
```

This allows requests from any origin. In production, restrict to:
```javascript
app.use(cors({
  origin: 'https://your-app.azurewebsites.net',
  credentials: true
}))
```

---

## **Useful Links**

- [Thunder Client](https://www.thunderclient.com/) - VS Code API testing
- [Postman](https://www.postman.com/) - API platform
- [JWT.io](https://jwt.io/) - JWT debugging
- [REST API Best Practices](https://restfulapi.net/)

---

**Version:** 1.0.0  
**Last Updated:** April 6, 2026
