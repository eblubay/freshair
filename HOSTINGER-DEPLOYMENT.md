# HOSTINGER STAGING DEPLOYMENT GUIDE

## REPOSITORY
- GitHub: eblubay/freshair
- Branch: `hostinger-deploy-ready`

## DEPLOYMENT STEPS

### 1. CREATE NODE.JS APP IN HOSTINGER

1. Login to hPanel
2. Go to **Advanced** → **Node.js**
3. Click **Create Application**
4. Configure:
   - **Application Mode**: Production
   - **Application Root**: `/home/username/freshair` (or your preferred path)
   - **Application URL**: Use temporary Hostinger URL (e.g., `username.hostingersite.com`)
   - **Application Startup File**: `server.js` (will be created)
   - **Node.js Version**: 18.x or higher

### 2. CONNECT GITHUB REPOSITORY

Option A - Via Git in Terminal:
```bash
cd /home/username/freshair
git clone https://github.com/eblubay/freshair.git .
git checkout hostinger-deploy-ready
```

Option B - Via hPanel Git Integration (if available)

### 3. INSTALL DEPENDENCIES

In Hostinger terminal:
```bash
cd /home/username/freshair
npm install
# or if bun is available:
# bun install
```

### 4. CONFIGURE ENVIRONMENT VARIABLES

In hPanel → Node.js App → Environment Variables, add:

```
# Database (Supabase)
DATABASE_URL=postgresql://postgres.hlcrpdcabbkjzlqfzduq:fUYL0DsKPGHwll9d@aws-0-us-east-2.pooler.supabase.com:5432/postgres
POSTGRES_URL=postgresql://postgres.hlcrpdcabbkjzlqfzduq:fUYL0DsKPGHwll9d@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://postgres.hlcrpdcabbkjzlqfzduq:fUYL0DsKPGHwll9d@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your_clerk_publishable_key]
CLERK_SECRET_KEY=[your_clerk_secret_key]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# SMTP (Hostinger)
SMTP_HOST=[your_hostinger_smtp_host]
SMTP_PORT=465
SMTP_USER=[your_email@domain.com]
SMTP_PASSWORD=[your_smtp_password]
FROM_EMAIL=[your_email@domain.com]

# Apify (optional, for future imports)
APIFY_API_TOKEN=[your_apify_token]

# Webhook
WEBHOOK_SECRET=[generate_random_string]

# App URL (update after deployment)
NEXT_PUBLIC_APP_URL=https://[your-temporary-url].hostingersite.com
```

### 5. BUILD APPLICATION

```bash
npm run build
```

### 6. CREATE SERVER.JS (if not exists)

Create `/home/username/freshair/server.js`:

```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
```

### 7. START APPLICATION

In hPanel → Node.js App:
- Click **Start Application**
- Wait for status to show "Running"

### 8. VERIFY DEPLOYMENT

Visit your temporary URL and verify:

- ✅ Homepage loads with ShellByTheShore logo
- ✅ All 21 photos display correctly
- ✅ MapLibre map renders (no gray box)
- ✅ Request Availability form works
- ✅ Email sends via Hostinger SMTP
- ✅ Mobile responsive
- ✅ HTTPS enabled
- ✅ No Freshair branding visible
- ✅ Owner dashboard accessible (separate login)

### 9. TEST CRITICAL FEATURES

1. **Homepage**: Logo, hero image, gallery, map, amenities
2. **Request Form**: Fill out and submit availability request
3. **Email**: Check inbox for inquiry notification
4. **Property Page**: Navigate to full listing details
5. **Mobile**: Test on 375px viewport
6. **Owner Dashboard**: Login with Clerk credentials

### 10. TROUBLESHOOTING

**Map not showing:**
- Check browser console for errors
- Verify MapLibre CSS is loaded
- Ensure HTTPS is enabled

**Build fails:**
- Check Node.js version (18+)
- Verify all dependencies installed
- Check environment variables

**Email not sending:**
- Verify SMTP credentials
- Check Hostinger email limits
- Test SMTP connection

**Images not loading:**
- Verify public/branding/logo.png exists
- Check external image URLs (Airbnb CDN)
- Verify Next.js image optimization

## CURRENT STATUS

✅ Code ready on branch: `hostinger-deploy-ready`
✅ Production build successful
✅ TypeScript errors resolved
✅ All features functional locally
✅ Logo integrated
✅ Freshair branding removed
✅ Request Availability implemented
✅ MapLibre working
✅ 58 amenities available
✅ Mobile responsive

## NEXT STEPS AFTER STAGING

1. Test thoroughly on staging URL
2. Fix any issues found
3. Update DNS to point custom domain
4. Update NEXT_PUBLIC_APP_URL to production domain
5. Rebuild and restart application
6. Final verification on production domain

## IMPORTANT NOTES

- **DO NOT** run new Apify imports during deployment
- **DO NOT** modify database directly
- **DO NOT** expose .env.local in repository
- **PRESERVE** all 21 original photos
- **MAINTAIN** single property setup
- **KEEP** Clerk authentication for owner dashboard

## SUPPORT

If deployment issues occur:
1. Check Hostinger error logs
2. Verify environment variables
3. Test build locally first
4. Contact Hostinger support if server issues
