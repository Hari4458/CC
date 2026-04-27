# ⚡ Quick Start Guide

Get StudyCloud running in 5 minutes!

---

## **For Local Development**

### Step 1: Install Dependencies
```bash
cd "CC project"
npm install
```

### Step 2: Configure Environment
Make sure `.env` file has your Azure credentials:
```env
SQL_SERVER=your-sql-server.database.windows.net
SQL_DATABASE=your-database-name
SQL_USER=your-sql-username
SQL_PASSWORD=your-sql-password
JWT_SECRET=your-secret-key
```

### Step 3: Run Server
```bash
npm run dev
```
Server starts on `http://localhost:3000`

### Step 4: Register & Test
1. Open `http://localhost:3000` in browser
2. Click "Register"
3. Create account with email/password
4. Check email for verification link
5. Upload a test file

---

## **For Azure Deployment**

### Step 1: Push to GitHub
```bash
git push origin main
```

### Step 2: Check Deployment
- Deployment Center → GitHub Actions
- Wait for workflow to complete (2-3 minutes)

### Step 3: Visit Your App
```
https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net
```

---

## **Useful Commands**

```bash
# Install dependencies
npm install

# Dev server (with auto-reload)
npm run dev

# Production server
npm start

# Check Node version
node --version

# Clear npm cache
npm cache clean --force
```

---

## **Quick Debugging**

### Check if server is running
```bash
curl http://localhost:3000/api/health
```

### View Azure logs
```bash
# Using Azure CLI
az webapp log tail --name studycloud-app-gccbe7gccyhkemgy --resource-group studycloud-rg
```

### Test API endpoint
```bash
# Using curl
curl -X GET http://localhost:3000/api/health
```

---

## **Common Issues**

| Issue | Solution |
|-------|----------|
| SQL connection fails | Check `.env` credentials |
| Port 3000 already in use | Kill process: `netstat -ano \| findstr :3000` |
| Modules not found | Run `npm install` again |
| Email not sending | Verify Gmail App Password |

---

## **Next Steps**

1. ✅ Get server running locally
2. ✅ Test signup/login
3. ✅ Test file upload
4. ✅ Deploy to Azure
5. ✅ Add security improvements (JWT Secret, CORS, etc.)

---

For detailed documentation, see [README.md](README.md)
