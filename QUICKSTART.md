# DeinContext - Quick Start Guide

## 5-Minute Setup

### Step 1: Clone and Install (1 min)
```bash
cd /workspaces/DDeutSch
npm install
```

### Step 2: Get API Keys (3 min)

#### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create Project" or select existing
3. Enable Firestore Database
4. Enable Google Authentication:
   - Go to Authentication → Sign-in method
   - Click "Google"
   - Enable it
   - Set your project support email
   - Click Save
5. Go to Project Settings → Your apps
6. Copy all values (apiKey, authDomain, projectId, etc.)

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Copy the key

### Step 3: Create `.env.local` (1 min)

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GEMINI_API_KEY=your_gemini_key
```

### Step 4: Set Firestore Rules (1 min)

1. Firebase Console → Firestore Database → Rules
2. Replace rules with content from `firestore.rules`
3. Click "Publish"

### Step 5: Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Testing the App

### Test User Creation
1. Click "Sign in with Google"
2. Select your Google account
3. You're now authenticated!

### Test Vocab Generation
1. After authentication, enter English term: "meeting"
2. Click "Generate Vocab"
3. Review generated data:
   - German: Besprechung
   - Article: die
   - Plural: Besprechungen
   - Example: (business context sentence)
4. Click "Save to Firestore"
5. Success! Your vocab is saved

### Verify in Firestore
1. Firebase Console → Firestore Database
2. Navigate to: `users/{your_uid}/vocab/`
3. You should see your card with all fields

---

## Common Issues & Solutions

### ❌ "NEXT_PUBLIC_GEMINI_API_KEY is not defined"
✅ **Fix:** 
- Create `.env.local` file (not `.env`)
- Restart dev server (`npm run dev`)
- Check variable name spelling exactly

### ❌ "Missing or insufficient permissions"
✅ **Fix:**
- Sign in/up first (not anonymous)
- Update Firestore Rules (copy from `firestore.rules`)
- Wait 30 seconds for rules to propagate

### ❌ Gemini returns broken JSON
✅ **Fix:**
- The Server Action automatically handles markdown wrapping
- Try a simpler term like "project" or "deadline"
- Check API key is valid and has quota

### ❌ Firestore document not appearing
✅ **Fix:**
- Check user is authenticated
- Check UID is correct (visible in "Save to Firestore" response)
- Refresh Firestore console
- Check rules allow writes for authenticated users

---

## Project Structure Reminder

```
src/
├── app/
│   ├── actions/generateVocab.ts     ← Server Action (Gemini)
│   ├── page.tsx                     ← Main page
│   └── layout.tsx
├── components/
│   ├── VocabForm.tsx                ← User form
│   ├── AuthDialog.tsx               ← Sign in/up
│   └── VocabList.tsx                ← Display saved cards
├── hooks/
│   └── useVocabGenerator.ts         ← Custom hook (Round Trip)
├── lib/
│   └── firebase.ts                  ← Firebase config
└── types/
    └── vocab.ts                     ← TypeScript interfaces
```

---

## Key Concepts

### Round Trip Pattern
```
User Input 
  ↓
Server Action (Secure Gemini Call)
  ↓
Returns JSON (No DB write)
  ↓
Custom Hook Receives JSON
  ↓
Hook Adds Timestamps
  ↓
Client SDK Saves to Firestore
```

**Why?** No need for Firebase Admin SDK. Secure. Simple.

### useVocabGenerator Hook

Three ways to use:

**1. Simple Combined Flow** (Recommended)
```typescript
const { generateAndSave } = useVocabGenerator()
const docId = await generateAndSave('meeting')
```

**2. Step-by-Step Control**
```typescript
const { generateData, saveToFirestore } = useVocabGenerator()
const data = await generateData('meeting')
if (data) {
  const docId = await saveToFirestore(data)
}
```

**3. Advanced State Management**
```typescript
const {
  isGenerating,
  isSaving,
  error,
  generatedData,
  generateData,
  saveToFirestore,
} = useVocabGenerator()
// Use individual states for custom UI
```

---

## Next Steps

### To Understand the Code
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for detailed explanation
2. Open [src/app/actions/generateVocab.ts](src/app/actions/generateVocab.ts) to see Gemini integration
3. Open [src/hooks/useVocabGenerator.ts](src/hooks/useVocabGenerator.ts) to see Firestore integration

### To Customize
1. **Change business context**: Edit `VOCAB_PROMPT_TEMPLATE` in generateVocab.ts
2. **Add fields**: Update `VocabCard` interface in types/vocab.ts
3. **Modify styling**: Edit Tailwind classes in components (or globals.css)

### To Deploy
```bash
npm run build  # Test build
npm run lint   # Check for issues
git add .
git commit -m "Deploy DeinContext"
git push
# Deploy to Vercel: vercel deploy
```

---

## Need Help?

- **Gemini API**: https://ai.google.dev/docs
- **Firebase**: https://firebase.google.com/docs
- **Next.js**: https://nextjs.org/docs
- **Tailwind**: https://tailwindcss.com/docs

Good luck! 🚀
