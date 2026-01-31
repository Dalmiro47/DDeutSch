import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate Firebase config
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const

for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.warn(
      `Firebase config warning: ${key} is not defined. Some features may not work.`
    )
  }
}

// Initialize Firebase - avoid reinitializing if already initialized
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Get Firestore and Auth instances
export const db = getFirestore(app)
export const auth = getAuth(app)

export default app
