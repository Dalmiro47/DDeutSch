# DeinContext - German Learning App

An automated flashcard application built with Next.js, Firebase, and Google Gemini AI. Generate German vocabulary cards from English terms with business context examples.

## Features

- **Automated Generation**: Input English words, get German translations with articles, plurals, and business context examples
- **Firestore Storage**: All vocabulary cards are stored in Firebase Firestore per user
- **Business Focus**: All example sentences use corporate/office contexts (meetings, projects, ERP systems, etc.)
- **Client-Only Backend**: Uses Firebase Client SDK only - no server-side administration needed
- **Server Actions**: Leverages Next.js Server Actions for secure Gemini API communication
- **Round Trip Architecture**: Strict separation between AI generation and data persistence

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Backend**: Firebase (Firestore & Authentication)
- **AI**: Google Gemini API (gemini-1.5-flash)
- **State Management**: React Hooks

## Project Structure

```
src/
├── app/
│   ├── actions/          # Next.js Server Actions
│   │   └── generateVocab.ts
│   ├── page.tsx          # Main page with auth check
│   ├── layout.tsx        # Root layout
├── components/           # React components
│   ├── VocabForm.tsx
│   └── AuthDialog.tsx
├── hooks/                # Custom React hooks
│   └── useVocabGenerator.ts
├── lib/                  # Utilities and config
│   └── firebase.ts
├── styles/               # Global styles
│   └── globals.css
└── types/                # TypeScript types
    └── vocab.ts
```

## Data Model

### VocabCard (Firestore)

```typescript
interface VocabCard {
  originalTerm: string
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
  category: 'work' | 'general'
  nextReview: Timestamp
  createdAt: Timestamp
}
```

**Collection Path**: `users/{userId}/vocab/{vocabId}`

## Architecture: Round Trip Pattern

### Data Flow

1. **Client**: User submits English term via form
2. **Server Action** (`generateVocabData`):
   - Validates input
   - Calls Gemini API with strict prompt engineering
   - Returns structured JSON (VocabCardInput)
   - Does NOT save to database
3. **Client Hook** (`useVocabGenerator`):
   - Receives JSON from Server Action
   - Adds timestamps (createdAt, nextReview)
   - Saves to Firestore using Client SDK
4. **Database**: Document stored in `users/{userId}/vocab/{vocabId}`

This pattern ensures:
- No Admin SDK dependency
- Secure API key handling (Server Action)
- Clean separation of concerns
- Easy maintenance

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Google Gemini API key

### 2. Environment Variables

Create `.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

**Where to find these values:**

- **Firebase**: [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps
- **Gemini API**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/vocab/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### 4. Installation

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Server Action: `generateVocabData`

Located in [src/app/actions/generateVocab.ts](src/app/actions/generateVocab.ts)

### Key Features

- **Prompt Engineering**: Strict JSON format instructions for Gemini
- **Input Validation**: Sanitizes and validates English terms
- **Error Handling**: Comprehensive error management with error codes
- **JSON Parsing**: Extracts JSON from Gemini response (handles markdown wrapping)
- **Article Validation**: Ensures valid German articles (der/die/das/none)

### Example Call

```typescript
const response = await generateVocabData('meeting')
// Returns:
// {
//   success: true,
//   data: {
//     originalTerm: 'meeting',
//     germanTerm: 'Besprechung',
//     article: 'die',
//     plural: 'Besprechungen',
//     exampleSentence: 'Die Besprechung mit dem Team findet morgen um 10 Uhr statt.',
//     category: 'work'
//   }
// }
```

## Custom Hook: `useVocabGenerator`

Located in [src/hooks/useVocabGenerator.ts](src/hooks/useVocabGenerator.ts)

### State

```typescript
{
  isLoading: boolean       // Overall loading state
  isGenerating: boolean    // Gemini API call in progress
  isSaving: boolean        // Firestore write in progress
  error: string | null     // Error message
  generatedData: VocabCardInput | null
  savedVocabId: string | null
}
```

### Methods

- `generateData(englishTerm)`: Call Gemini API, returns VocabCardInput
- `saveToFirestore(vocabData)`: Write to Firestore, returns document ID
- `generateAndSave(englishTerm)`: Combined operation (recommended)
- `resetState()`: Clear all state

### Example Usage

```typescript
const {
  isLoading,
  error,
  generatedData,
  generateAndSave,
  resetState,
} = useVocabGenerator()

// Option 1: Combined flow
const savedId = await generateAndSave('deadline')

// Option 2: Step-by-step control
const vocabData = await generateData('project')
if (vocabData) {
  const id = await saveToFirestore(vocabData)
}
```

## Components

### VocabForm

Main component for generating and saving vocabulary cards. Includes:
- Input form for English terms
- Generation status indicators
- Generated data preview
- Save/Cancel buttons
- Error display
- Success confirmation

### AuthDialog

Firebase authentication UI with:
- Google Sign-In via popup
- Error handling
- Loading states

## Maintenance Notes

### For Business Analysts / Hobbyist Developers

**Why this architecture is maintainable:**

1. **No Complex DevOps**: Uses Firebase Client SDK (no Admin SDK setup)
2. **Clear Data Flow**: Round Trip pattern separates concerns
3. **Typed Throughout**: Full TypeScript for IDE autocomplete
4. **Minimal Dependencies**: Only essential packages
5. **Modular Structure**: Each piece has a single responsibility
6. **Error Handling**: Comprehensive error messages and codes
7. **Timestamps Automatic**: Firebase Timestamps handle time zones

### Common Tasks

**Add a new field to VocabCard:**
1. Update `interface VocabCard` in [src/types/vocab.ts](src/types/vocab.ts)
2. Update Gemini prompt in [src/app/actions/generateVocab.ts](src/app/actions/generateVocab.ts)
3. Update form display in [src/components/VocabForm.tsx](src/components/VocabForm.tsx)

**Modify Gemini prompt:**
- Edit `VOCAB_PROMPT_TEMPLATE` in [src/app/actions/generateVocab.ts](src/app/actions/generateVocab.ts)
- Test with various terms before deploying

**Change Firestore rules:**
- Update in [Firebase Console](https://console.firebase.google.com/) → Firestore → Rules

## Troubleshooting

### "NEXT_PUBLIC_GEMINI_API_KEY is not defined"

- Ensure `.env.local` exists in project root
- Restart dev server after adding environment variables
- Check variable name: `NEXT_PUBLIC_GEMINI_API_KEY`

### Firestore writes fail

- Check Firestore Security Rules (above)
- Verify user is authenticated (`getAuth().currentUser`)
- Check Firebase project ID matches `.env.local`

### JSON parsing errors from Gemini

- Gemini sometimes wraps JSON in markdown code blocks
- The Server Action handles this with regex extraction
- If still failing, check Gemini API status

## Future Enhancements

- Vocabulary review system (spaced repetition)
- Progress tracking and statistics
- Vocabulary export (CSV/PDF)
- Dark mode toggle
- Multiple categories and custom contexts
- Batch import from CSV
- Study session mode with flashcard UI

## License

Private Project - Do not distribute

## Support

For questions or issues, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
