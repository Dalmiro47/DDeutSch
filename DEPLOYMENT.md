# DeinContext - Deployment Guide

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel é a plataforma ideal para Next.js. Integração com GitHub, deploys automáticos, serverless.

#### Steps:

1. **Push to GitHub**
```bash
git remote add origin https://github.com/YourUsername/DDeutSch.git
git branch -M main
git push -u origin main
```

2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Sign in with GitHub
- Click "Import Project"
- Select your `DDeutSch` repository
- Click "Import"

3. **Add Environment Variables**
- In Vercel dashboard: Settings → Environment Variables
- Add all variables from `.env.local`:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_GEMINI_API_KEY`

4. **Deploy**
- Click "Deploy"
- Wait for build to complete
- Your app is live! 🎉

#### Auto-Deploy on Push
- Every push to `main` branch automatically redeploys
- Preview deployments for pull requests

---

### Option 2: Firebase Hosting

Firebase Hosting integrates directly with Firebase for your backend.

#### Steps:

1. **Install Firebase CLI**
```bash
npm install -g firebase-tools
firebase login
```

2. **Initialize Firebase**
```bash
firebase init hosting
# Select your Firebase project
# Choose "dist" as public directory
# Configure as single-page app? No
```

3. **Build Next.js Project**
```bash
npm run build
```

4. **Deploy**
```bash
firebase deploy --only hosting
```

#### Environment Variables
- Firebase Hosting doesn't automatically read `.env.local`
- Use `.env.production` for production environment variables
- Or use Firebase Hosting configuration

---

### Option 3: Docker + Any Hosting

For more control, deploy with Docker.

#### Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000

ENV NODE_ENV=production
CMD ["npm", "start"]
```

#### Build & Run
```bash
docker build -t deincontext:latest .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx \
  # ... other env vars
  deincontext:latest
```

**Hosts that support Docker:**
- AWS ECS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Render
- Railway

---

## Pre-Deployment Checklist

- [ ] All environment variables set in `.env.local` locally
- [ ] Test app locally: `npm run dev`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Firestore Security Rules deployed
- [ ] Firebase Authentication enabled (Email/Password)
- [ ] Gemini API key has quota available
- [ ] `.env.local` is in `.gitignore` (don't commit secrets!)
- [ ] Test authentication flow
- [ ] Test vocab generation and saving
- [ ] Review Firestore quota limits for your project

---

## Post-Deployment Testing

### 1. Check Deployment Status
- Vercel: Dashboard shows build status
- Firebase: `firebase hosting:list`
- Docker: `docker logs <container_id>`

### 2. Test Production App
```bash
# Visit your deployed URL
# Test signup/login
# Try creating a vocab card
# Check Firestore console for new documents
```

### 3. Monitor Performance
**Vercel:**
- Dashboard → Analytics
- Check response times, page loads

**Firebase:**
- Console → Firestore → Usage
- Monitor read/write operations

### 4. Error Tracking
- Set up error reporting (optional)
- Use browser DevTools console
- Check Firebase Functions logs (if used)

---

## Environment Variables for Production

### Vercel Example
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=myproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=myproject-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=myproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyD...
```

**Important Security Notes:**
- Variables starting with `NEXT_PUBLIC_` are exposed to browser (safe for API keys that are public)
- Google Gemini API keys should be restricted by domain
- Firebase rules protect your database (no Admin SDK needed)

---

## Scaling & Quotas

### Firestore Quotas (Free Tier)
- **Writes**: 20,000/day
- **Reads**: 50,000/day
- **Deletes**: 20,000/day
- **Stored data**: 1 GB

**For 100+ daily users**, upgrade to Blaze plan (pay-as-you-go)

### Gemini API Quotas
- Free tier: 60 requests/minute
- Upgrade to higher limits as needed
- Monitor usage in Google AI Studio

---

## Troubleshooting Production Issues

### App Won't Load
- Check browser console for errors
- Verify Firebase config variables are set
- Check Firestore Security Rules allow public access for signin

### Can't Sign Up
- Verify Email/Password auth enabled in Firebase
- Check network tab for API errors
- Review Firebase quota

### Vocab Generation Fails
- Verify Gemini API key is valid
- Check quota isn't exceeded
- Verify Server Action logs

### Firestore Writes Fail
- Check Firestore Security Rules
- Verify user is authenticated
- Check quota limits

---

## Database Migrations

If you need to add fields to existing cards:

```typescript
// Add a field to all documents (use Firebase Console or this script)
import { collection, getDocs, updateDoc } from 'firebase/firestore'

async function migrateAddField(userId: string, newField: string, defaultValue: any) {
  const vocabRef = collection(db, 'users', userId, 'vocab')
  const snapshot = await getDocs(vocabRef)
  
  for (const doc of snapshot.docs) {
    await updateDoc(doc.ref, {
      [newField]: defaultValue,
    })
  }
}
```

---

## Backup & Recovery

### Firestore Backups
1. Firebase Console → Firestore → Backups
2. Enable automatic backups (Premium feature)
3. Or manually export: `firebase firestore:export gs://bucket-name`

### Data Export
```bash
firebase firestore:export --export-path=./backups/$(date +%Y%m%d)
```

---

## Performance Optimization

### Frontend
- Images: Use next/image for optimization
- Code splitting: Automatic with Next.js
- CSS: Tailwind purges unused styles

### Backend
- Firestore indexes: Firebase creates automatically
- Server Actions: Already optimized
- Caching: Add next/cache if needed

### Database
- Index your queries in Firestore Console
- Monitor slow queries
- Batch operations when possible

---

## Security Hardening

### Before Production Launch
1. ✅ Firestore Security Rules deployed (see firestore.rules)
2. ✅ API keys restricted by domain
3. ✅ Authentication enabled
4. ✅ HTTPS enforced (automatic on Vercel/Firebase Hosting)
5. ✅ No hardcoded secrets in code
6. ✅ Environment variables managed securely

### Ongoing
- Regular security audits
- Keep dependencies updated: `npm audit fix`
- Monitor Firebase security advisories
- Review access logs periodically

---

## Cost Estimation (Monthly)

### Typical Usage (100 users, ~10 vocab cards/user)

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Firestore | $0 | 10K writes | $0 |
| Firebase Auth | $0 | 1K signups | $0 |
| Gemini API | Free | 1K requests | ~$0.20 |
| Vercel | $0 | 100K function calls | $0 |
| **Total** | - | - | **~$0.20** |

### High Usage (1000 users, ~50 vocab cards/user)

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Firestore | Exceeded | 50K writes | ~$4 |
| Firebase Auth | $0 | 10K signups | $0 |
| Gemini API | Free | 50K requests | ~$10 |
| Vercel Pro | $20/mo | 1M function calls | $20 |
| **Total** | - | - | **~$34/mo** |

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Firebase Docs**: https://firebase.google.com/docs/hosting
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Gemini API Status**: https://aistudio.google.com

Good luck! 🚀
