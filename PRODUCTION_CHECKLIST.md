# ✅ Production Checklist & Security Guide

Pre-launch verification and security hardening

---

## **🚨 Critical Security Issues to Fix BEFORE Production**

### ⚠️ Issue 1: Weak JWT Secret
**Current:** `JWT_SECRET=your-secret-key`

**Why it's bad:** Can be easily guessed, jeopardizing all user sessions

**Fix:**
```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Update in Azure:**
1. App Service → Configuration → Application settings
2. Find `JWT_SECRET`
3. Replace with generated value
4. Click Save

**Result:** Old tokens instantly invalid (users need to re-login)

---

### ⚠️ Issue 2: SQL Password in Environment Variables
**Current:** `SQL_PASSWORD=your-sql-password` visible in logs

**Why it's bad:** Exposed if logs are accessed or git history checked

**Fix - Option A: Azure Key Vault (Recommended)**
```bash
# Create Key Vault in Azure Portal
# Store secrets securely
# Reference in App Service using @Microsoft.KeyVault()
```

**Fix - Option B: System-Assigned Managed Identity**
```javascript
// In production code
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

const client = new SecretClient(
  `https://studycloud-kv.vault.azure.net/`,
  new DefaultAzureCredential()
);

const dbPassword = await client.getSecret("sql-password");
```

---

### ⚠️ Issue 3: Gmail App Password Exposed
**Current:** `EMAIL_PASSWORD=your-app-password` in `.env`

**Why it's bad:** Email account compromised if leaked

**Fix:**
1. Generate new Gmail App Password
2. Update in Azure App Service settings
3. Remove from local `.env`
4. Enable Gmail 2FA if not already

---

### ⚠️ Issue 4: Email Sending Without Rate Limits
**Current:** No limit on verification email resends

**Why it's bad:** Spam attacks, quota exceeded, service throttled

**Fix:**
```bash
npm install express-rate-limit
```

```javascript
// In server.js
const rateLimit = require('express-rate-limit');

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 emails per hour
  message: 'Too many email requests, try again later'
});

app.post('/api/auth/resend-verification', emailLimiter, async (req, res) => {
  // ... existing code ...
});
```

---

### ⚠️ Issue 5: No Input Validation
**Current:** Server accepts any input without validation

**Why it's bad:** SQL injection, XSS, data corruption, crashes

**Fix:**
```bash
npm install joi
```

```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

---

### ⚠️ Issue 6: Missing HTTPS
**Current:** App may serve over HTTP

**Why it's bad:** Passwords/tokens transmitted in plain text

**Fix:**
```
App Service → TLS/SSL settings → HTTPS only: ON
```

Verify:
```bash
# Should redirect HTTP to HTTPS
curl -I http://studycloud-app-...azurewebsites.net
# Response: 301 Moved Permanently
```

---

### ⚠️ Issue 7: Overly Permissive CORS
**Current:** `app.use(cors())` allows ANY origin

**Why it's bad:** XSS attacks from malicious sites

**Fix:**
```javascript
const corsOptions = {
  origin: [
    'https://your-app.azurewebsites.net',
    'https://studycloud.com', // Your custom domain
    // localhost for development only
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

### ⚠️ Issue 8: No SQL Injection Protection
**Current:** Potential vulnerable queries

**Why it's bad:** Complete database compromise

**Fix:** Already using Tedious with parameterized queries ✅

But verify no raw string concatenation:
```javascript
// ❌ BAD - Vulnerable
const query = `SELECT * FROM Users WHERE email = '${email}'`;

// ✅ GOOD - Safe (what we use)
const request = new Request(`
  SELECT * FROM Users WHERE email = @email
`, (err) => { ... });

request.addParameter('email', TYPES.NVarChar, email);
```

---

### ⚠️ Issue 9: No Logging/Monitoring
**Current:** Hard to detect attacks, debug issues

**Why it's bad:** Can't detect security breaches or performance problems

**Fix:**
```bash
# 1. Enable Application Insights
App Service → Application Insights → Create new → Save

# 2. Add logging
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('User login attempt', { email: req.body.email });
```

---

### ⚠️ Issue 10: Missing Database Backups
**Current:** No automated backups

**Why it's bad:** Data loss if database fails

**Fix:**
```
SQL Database → Backups → 
- Point-in-time restore: Automatic (35 days)
- Long-term retention: Enable (7 years)
```

---

## **✅ Production Checklist**

### Phase 1: Security Hardening

- [ ] JWT Secret: Generated new strong secret
- [ ] SQL Password: In Key Vault or encrypted
- [ ] Email Password: Updated and secure
- [ ] Input Validation: Implemented with Joi
- [ ] HTTPS Only: Enforced in App Service
- [ ] CORS: Restricted to known origins
- [ ] Rate Limiting: Added to sensitive endpoints
- [ ] Helmet: Security headers added
  ```bash
  npm install helmet
  ```
  ```javascript
  app.use(require('helmet')());
  ```
- [ ] Cloud Storage: Verified backups enabled
- [ ] Error Handling: Users don't see stack traces
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      // Don't expose error details to users
    });
  });
  ```

### Phase 2: Performance & Reliability

- [ ] Database Connection Pooling: Verified
- [ ] Request Timeout: Set to 120s for large uploads
- [ ] Compression: Enable gzip
  ```bash
  npm install compression
  ```
  ```javascript
  app.use(require('compression')());
  ```
- [ ] Caching: Static files cached
  ```javascript
  app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: false
  }));
  ```
- [ ] Database Indexes: Created on hot tables
  ```sql
  CREATE INDEX idx_users_email ON Users(Email);
  CREATE INDEX idx_files_userid ON Files(UserId);
  ```
- [ ] Query Optimization: No N+1 queries
- [ ] Memory Leaks: Tested with load testing
- [ ] Application Insights: Monitoring enabled

### Phase 3: Deployment & Operations

- [ ] GitHub Actions: CI/CD pipeline working
- [ ] Azure Deployment Slots: Staging slot for testing
- [ ] Database Migrations: Strategy documented
- [ ] Runbook: Operations manual created
- [ ] On-Call: Support contact assigned
- [ ] Monitoring Alerts: Email notifications enabled
- [ ] Log Aggregation: Logs centralized (Application Insights)
- [ ] Disaster Recovery: RTO/RPO defined

### Phase 4: Compliance & Documentation

- [ ] Privacy Policy: Created and linked
- [ ] Terms of Service: Created and linked
- [ ] Data Retention: Policy documented
- [ ] GDPR Compliance: Right to deletion implemented
  ```javascript
  // Allow users to delete their account
  app.delete('/api/users/account', async (req, res) => {
    // 1. Delete user's files
    // 2. Delete user record
    // 3. Purge from logs
  });
  ```
- [ ] Audit Logs: User actions logged
  ```sql
  CREATE TABLE AuditLog (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER,
    Action NVARCHAR(50),
    Timestamp DATETIME,
    IpAddress NVARCHAR(50)
  );
  ```
- [ ] API Documentation: Public docs available
- [ ] Code Comments: Well documented
- [ ] README: Updated with setup instructions
- [ ] CHANGELOG: Version history maintained

### Phase 5: Testing

- [ ] Unit Tests: All functions tested
- [ ] Integration Tests: API endpoints tested
- [ ] Load Testing: 1000+ concurrent users
  ```bash
  npm install artillery
  # artillery quick --count 100 --num 1000 https://studycloud-app...
  ```
- [ ] Security Scanning: OWASP ZAP scan
- [ ] Dependency Audit: Check for vulnerabilities
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] Manual Testing: All features tested in production

### Phase 6: Monitoring & Alerting

- [ ] Application Insights Dashboard: Created
- [ ] Uptime Monitoring: Configured (e.g., Pingdom)
- [ ] Error Rate Alert: Trigger if > 0.1%
- [ ] Latency Alert: Trigger if p99 > 2s
- [ ] CPU Alert: Trigger if > 80%
- [ ] Memory Alert: Trigger if > 85%
- [ ] Database Alert: Trigger if DTU > 80%
- [ ] Email Alerts: Send to ops team
- [ ] Slack Integration: Post alerts to channel
- [ ] Status Page: Public status page created

---

## **🔒 Security Headers Reference**

Add to `server.js`:

```javascript
const helmet = require('helmet');

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
  }
}));

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

---

## **🔍 Security Scanning Tools**

Run these before production:

### 1. Dependency Vulnerabilities
```bash
npm audit
npm audit --json > audit-report.json
```

### 2. OWASP Security Check
```bash
npm install -g snyk
snyk test
snyk monitor
```

### 3. Static Code Analysis
```bash
npm install -g eslint
eslint . --ext .js
```

### 4. SSL/TLS Check
```bash
# Online tool: https://www.ssllabs.com/ssltest/
# Your URL: https://studycloud-app...azurewebsites.net
```

---

## **📊 Monitoring Metrics to Track**

After going live, monitor:

| Metric | Target | Alert |
|--------|--------|-------|
| Uptime | > 99.9% | < 99.5% |
| Response Time (p50) | < 500ms | > 1s |
| Response Time (p99) | < 2s | > 5s |
| Error Rate | < 0.1% | > 1% |
| CPU Usage | < 50% | > 80% |
| Memory Usage | < 60% | > 85% |
| Database Connections | < 50 | > 100 |
| File Upload Success | > 99.9% | < 99% |
| Email Delivery | > 99% | < 95% |

---

## **🆘 Incident Response Plan**

### When Something Goes Wrong:

1. **Detect** (Application Insights alerts)
2. **Notify** (Alert sent to ops team)
3. **Diagnose** (Check logs, metrics, recent changes)
4. **Mitigate** (Rollback or scale up)
5. **Fix** (Update code, deploy fix)
6. **Communicate** (Status page update)
7. **Post-Mortem** (Analyze root cause)

**Escalation Process:**
```
Alert → On-Call Engineer → Lead → Manager → CTO
```

**On-Call Contact:** [Your contact info]  
**Escalation Timeout:** 15 minutes per level

---

## **📋 Go-Live Sign-Off**

Before launching to users, get approval:

```
Security Review:
Signed: _________________ Date: _______

Performance Review:
Signed: _________________ Date: _______

Compliance Review:
Signed: _________________ Date: _______

Operations Review:
Signed: _________________ Date: _______

Product Lead Approval:
Signed: _________________ Date: _______
```

---

## **📝 Post-Launch Monitoring (First 24 Hours)**

- [ ] Site loads without errors
- [ ] Users can register successfully
- [ ] Email verification working
- [ ] File uploads working
- [ ] No spike in error rates
- [ ] Response times acceptable
- [ ] Database queries performing well
- [ ] Backups created successfully
- [ ] Monitoring alerts working
- [ ] No security incidents detected

---

## **🎯 Success Metrics (First Month)**

- User registrations: > 10
- File uploads: > 50
- Email verification rate: > 90%
- User retention: > 80%
- System uptime: 99.9%+
- Average response time: < 500ms
- Error rate: < 0.5%

---

## **🚀 Future Improvements**

Once stable, consider:

- [ ] OAuth/SSO Integration (Google, GitHub login)
- [ ] Mobile App (React Native)
- [ ] Collaboration Features (Share notes)
- [ ] AI Features (Auto-categorization, summarization)
- [ ] Advanced Search (Full-text indexing)
- [ ] Two-Factor Authentication (2FA)
- [ ] API Rate Limiting Tiers (Freemium model)
- [ ] Analytics Dashboard (Usage statistics)
- [ ] Export/Backup (Bulk download)
- [ ] Dark Mode UI (Already partially done)

---

**Version:** 1.0.0  
**Last Updated:** April 6, 2026

**Next Steps:**
1. ✅ Fix all 10 critical security issues above
2. ✅ Complete production checklist
3. ✅ Pass security scan
4. ✅ Get sign-off from stakeholders
5. ✅ Launch! 🎉
