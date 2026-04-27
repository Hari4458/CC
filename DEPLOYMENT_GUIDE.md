# 🚀 Azure Deployment Guide

Complete guide to deploy StudyCloud to Azure Production

---

## 📋 **Pre-Deployment Checklist**

- [ ] Azure subscription is active
- [ ] SQL Server and Database already created
- [ ] App Service already created
- [ ] `package.json` has all dependencies
- [ ] `.env` file is properly configured
- [ ] Code is in GitHub repository
- [ ] All tests pass locally (`http://localhost:3000`)

---

## **📊 Architecture Overview**

```
┌─────────────────────────────────────┐
│    GitHub Repository                │
│  (Code + GitHub Actions)            │
└──────────────┬──────────────────────┘
               │ git push
               ▼
┌─────────────────────────────────────┐
│    GitHub Actions (CI/CD)           │
│  - Build                             │
│  - Test (optional)                   │
│  - Deploy to Azure                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Azure App Service                │
│  - Node.js Runtime                   │
│  - Environment Variables             │
│  - HTTPS/Domain                      │
└──────────────┬──────────────────────┘
               │ connects to
               ▼
┌─────────────────────────────────────┐
│    Azure SQL Database               │
│  - Users Table                       │
│  - Files Table                       │
│  - File Storage (VARBINARY)          │
└─────────────────────────────────────┘
```

---

## **🔧 Step 1: Prepare Application**

### 1.1 Install Dependencies
```bash
npm install
```

Verify `package.json` includes:
- express
- tedious (SQL)
- jsonwebtoken (JWT)
- bcryptjs (Password hashing)
- nodemailer (Email)
- cors
- multer (File uploads)
- dotenv

### 1.2 Test Locally
```bash
# Start local server
npm run dev

# Open browser
# http://localhost:3000
```

Test all features:
- Register user
- Verify email
- Upload file
- Download file
- Logout

### 1.3 Verify `.env` Configuration
```env
# Azure resources must be created first
SQL_SERVER=your-sql-server.database.windows.net
SQL_DATABASE=your-database-name
SQL_USER=your-sql-username
SQL_PASSWORD=your-sql-password

NODE_ENV=production
PORT=8080  # Azure assigns port, use 8080

STORAGE_METHOD=sql
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

VERIFICATION_URL=https://your-app.azurewebsites.net/verify-email.html
JWT_SECRET=your-secret-key
```

---

## **📤 Step 2: Push to GitHub**

### 2.1 Initialize Git Repository (if new)
```bash
git init
git add .
git commit -m "Initial StudyCloud project"
git branch -M main
git remote add origin https://github.com/yourusername/studycloud.git
git push -u origin main
```

### 2.2 Create `.gitignore` (if not exists)
```
node_modules/
.env
.env.local
.env.*.local
deploy.zip
*.log
.DS_Store
dist/
build/
```

### 2.3 Push Code to GitHub
```bash
git add .
git commit -m "Ready for Azure deployment"
git push origin main
```

---

## **☁️ Step 3: Configure Azure App Service**

### 3.1 Login to Azure Portal
Go to: https://portal.azure.com

### 3.2 Navigate to Your App Service
1. Search "App Services"
2. Find `studycloud-app-gccbe7gccyhkemgy...`
3. Click to open

### 3.3 Set Environment Variables
1. Go to **Configuration** (left sidebar)
2. Click **Application settings** tab
3. Click **+ New application setting**

Add each variable:

| Name | Value |
|------|-------|
| `SQL_SERVER` | `your-sql-server.database.windows.net` |
| `SQL_DATABASE` | `your-database-name` |
| `SQL_USER` | `your-sql-username` |
| `SQL_PASSWORD` | `your-sql-password` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `STORAGE_METHOD` | `sql` |
| `EMAIL_SERVICE` | `gmail` |
| `EMAIL_USER` | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | `your-app-password` |
| `VERIFICATION_URL` | `https://your-app.azurewebsites.net/verify-email.html` |
| `JWT_SECRET` | `[Generate random string]` |

4. Click **Save** (top button)
5. Wait for settings to apply (1-2 minutes)

### 3.4 Generate Secure JWT Secret
Use command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2`

Copy to `JWT_SECRET` in Azure settings

---

## **🔗 Step 4: Setup GitHub Actions (CI/CD)**

### 4.1 Connect GitHub to Azure
1. In App Service → **Deployment Center** (left sidebar)
2. **Source:** Select "GitHub"
3. Click **Authorize** (authenticate with GitHub)
4. **Organization:** Select your GitHub account
5. **Repository:** Select `studycloud` repo
6. **Branch:** Select `main`

### 4.2 Azure Auto-Creates Workflow
Azure automatically creates GitHub Actions workflow:
- File: `.github/workflows/[name]_[app-name].yml`
- Location: Your GitHub repository
- Trigger: On push to `main` branch

**Workflow does:**
1. ✅ Check out code
2. ✅ Install Node.js 22
3. ✅ Install dependencies (`npm install`)
4. ✅ Build application
5. ✅ Deploy to App Service

### 4.3 Verify Workflow
1. Go to GitHub repository
2. **Actions** tab
3. See workflow status (building/deployed)
4. Check logs if deployment fails

---

## **🚀 Step 5: Deploy**

### 5.1 Automatic Deployment (GitHub Actions)
Every time you push to `main`:
```bash
git add .
git commit -m "Update features"
git push origin main
```

Deployment starts automatically:
- Check Deployment Center in Azure Portal
- Monitor GitHub Actions for progress
- Takes ~2-5 minutes

### 5.2 Manual Deployment (if needed)
```bash
# Using Azure CLI
az webapp up --name studycloud-app-gccbe7gccyhkemgy --resource-group studycloud-rg --runtime "Node:22"
```

### 5.3 Deployment Status Check
View logs:
1. Azure Portal → App Service
2. **Log stream** (left sidebar)
3. See real-time deployment and application logs

---

## **✅ Step 6: Verify Deployment**

### 6.1 Test Application is Online
```bash
# Check app is responding
curl https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net/api/health
```

Expected response:
```json
{"status":"OK","timestamp":"...","uptime":...}
```

### 6.2 Test in Browser
1. Open: `https://studycloud-app-gccbe7gccyhkemgy.centralindia-01.azurewebsites.net`
2. Register new account
3. Check email for verification link
4. Click verification link
5. Login successfully
6. Upload test file
7. Download test file

### 6.3 Check Azure Application Insights (optional)
1. App Service → **Application Insights** (left sidebar)
2. See uptime, load, errors
3. Monitor performance metrics

### 6.4 View Live Logs
```
App Service → Log stream → Live view
```

Shows real-time server output (like nodemon dev mode)

---

## **🔒 Security Configuration**

### 7.1 Enable HTTPS Only
1. App Service → **TLS/SSL settings** (left)
2. **HTTPS only:** Toggle ON
3. **Minimum TLS version:** 1.2
4. Click **Save**

### 7.2 Configure Firewall Rules
1. SQL Server → **Firewalls and virtual networks** (left)
2. **Allow Azure services and resources:** ON
3. Add App Service IP (automatic)
4. Click **Save**

### 7.3 Enable Managed Identity (optional but recommended)
1. App Service → **Identity** (left sidebar)
2. **Status:** Toggle ON
3. Click **Save**

Allows secure connection to Key Vault without hardcoding secrets

### 7.4 Add Security Headers (in code, recommended)
```bash
npm install helmet
```

In `server.js`:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## **📊 Step 7: Add Custom Domain (Optional)**

### 7.1 Buy Domain
Register at GoDaddy, namecheap, Azure Domains, etc.

### 7.2 Add to Azure
1. App Service → **Custom domains** (left)
2. Click **+ Add custom domain**
3. Enter domain name: `studycloud.com`
4. Add DNS records as instructed

### 7.3 Create SSL Certificate
1. App Service → **TLS/SSL settings**
2. **Private key certificates** → **Create App Service managed certificate**
3. Select your domain
4. Click **Create**

---

## **🔄 Step 8: Continuous Deployment Updates**

Now that CI/CD is set up, deploying updates is simple:

### Update & Deploy
```bash
# Make changes to code
# ... edit files ...

# Commit and push
git add .
git commit -m "Add feature X"
git push origin main
```

**Automatic:**
- GitHub detects push
- Workflow triggers
- Builds and tests
- Deploys to Azure
- App restarts with new code
- Deployment complete in 2-5 minutes

### Monitor Deployment
1. GitHub: **Actions** tab → See workflow status
2. Azure: **Deployment Center** → See deployment history
3. Azure: **Log stream** → See live logs

---

## **🐛 Troubleshooting Deployment**

### Issue: "Deployment failed"
**Check:**
1. App Service → **Log stream** for error messages
2. GitHub Actions → Workflow logs for build errors
3. Ensure all dependencies in `package.json`

### Issue: "Application Error - Server Error"
**Check:**
1. Environment variables in Azure Configuration
2. SQL connection string and credentials
3. Database tables exist (check SQL Server)

### Issue: "Cannot connect to database"
**Check:**
1. SQL Server IP firewall rules
2. Network connectivity from App Service subnet
3. Credentials match `.env` values
4. Database `StudyNotesDB` exists

### Issue: "Email not sending"
**Check:**
1. `EMAIL_USER` and `EMAIL_PASSWORD` in Azure settings
2. Gmail 2FA enabled
3. Gmail App Password generated (not regular password)
4. SMTP server blocked by ISP

### Issue: "503 Service Unavailable"
**Check:**
1. App Service status (should be "Running")
2. Restart App Service: **Overview** → **Restart**
3. Check if App Service plan resources exceeded
4. Upgrade to higher tier if needed

---

## 📈 **Scaling the Application**

As your app grows:

### 1. **Scale Up** (More powerful single instance)
- App Service → **Scale up** (left)
- Choose higher tier: B2, B3, S1, S2, etc.

### 2. **Scale Out** (Multiple instances)
- App Service → **Scale out** (left)
- Increase instance count: 2, 3, 4+
- Configure auto-scale rules

### 3. **Upgrade Database**
- SQL Database → **Compute + Storage**
- Choose higher DTU tier for more capacity
- Premium tier for high performance

### 4. **Add CDN** (Content Delivery Network)
- Front Door or Azure CDN
- Cache static assets
- Reduce latency globally

---

## **📋 Post-Deployment Checklist**

After deploying to production:

- [ ] App loads in browser
- [ ] HTTPS works (green lock icon)
- [ ] Registration/login works
- [ ] Email verification works
- [ ] File upload works
- [ ] File download works
- [ ] File deletion works
- [ ] Performance acceptable (<2s load time)
- [ ] Security headers present
- [ ] No error messages in logs
- [ ] SSL certificate valid
- [ ] Backups configured for database
- [ ] Monitoring alerts set up
- [ ] Team notified of live URL

---

## **🔄 Rollback Deployment**

If something goes wrong after deployment:

### Option 1: Git Revert
```bash
# Find previous commit
git log

# Revert to previous version
git revert <commit-hash>
git push origin main

# Auto-deploys previous version
```

### Option 2: Azure Swap Slots
(Requires App Service to have staging slot)

1. App Service → **Deployment slots**
2. Create "staging" slot
3. Deploy to staging first
4. Test thoroughly
5. Swap staging ↔ production
6. Instant rollback if needed

### Option 3: Manual Azure Restart
If deployment needs immediate stop:
1. App Service → **Overview**
2. Click **Stop**
3. Click **Start** to resume

---

## **📞 Support Resources**

| Issue | Resource |
|-------|----------|
| Azure SQL Help | [Azure SQL Docs](https://learn.microsoft.com/azure/sql-database/) |
| App Service Help | [App Service Docs](https://learn.microsoft.com/azure/app-service/) |
| Node.js Help | [Node.js Docs](https://nodejs.org/docs/) |
| GitHub Actions | [Actions Docs](https://docs.github.com/actions) |
| TypeScript Errors | [TypeScript Handbook](https://www.typescriptlang.org/docs/) |

---

## **Deployment Timeline**

| Step | Time |
|------|------|
| Push to GitHub | 1 min |
| GitHub Actions Build | 2-3 min |
| Deploy to Azure | 1-2 min |
| App restart | 30 sec |
| **Total** | **5-7 min** |

---

**Version:** 1.0.0  
**Last Updated:** April 6, 2026

Next → See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for go-live tasks

