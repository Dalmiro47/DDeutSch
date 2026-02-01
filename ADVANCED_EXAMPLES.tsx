// ADVANCED USAGE EXAMPLES FOR DEINCONTEXT
// These examples show advanced patterns and customizations

import { useVocabGenerator } from '@/hooks/useVocabGenerator'
import { generateVocabData } from '@/app/actions/generateVocab'
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { VocabCard } from '@/types/vocab'

// ============================================
// 1. USING useVocabGenerator WITH CUSTOM UI
// ============================================

export function AdvancedVocabForm() {
  const {
    isGenerating,
    isSaving,
  } = useVocabGenerator()

  return (
    <div>
      {/* Custom UI based on granular states */}
      {isGenerating && <p>🔄 Asking Gemini...</p>}
      {isSaving && <p>💾 Saving to Firestore...</p>}
    </div>
  )
}

// ============================================
// 2. BATCH PROCESSING MULTIPLE TERMS
// ============================================

export async function batchGenerateVocab(
  terms: string[],
  onProgress?: (completed: number, total: number) => void
) {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) throw new Error('User not authenticated')

  const results = []
  const now = Timestamp.now()
  const nextReviewTimestamp = Timestamp.fromDate(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  )

  for (let i = 0; i < terms.length; i++) {
    try {
      // Generate via Server Action
      const response = await generateVocabData(terms[i])

      if (response.success && response.data) {
        // Save to Firestore
        const userVocabRef = collection(db, 'users', user.uid, 'vocab')
        const docRef = await addDoc(userVocabRef, {
          ...response.data,
          createdAt: now,
          nextReview: nextReviewTimestamp,
        })

        results.push({
          term: terms[i],
          success: true,
          docId: docRef.id,
        })
      } else {
        results.push({
          term: terms[i],
          success: false,
          error: response.error?.message,
        })
      }
    } catch (error) {
      results.push({
        term: terms[i],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, terms.length)
    }
  }

  return results
}

// Usage:
// const results = await batchGenerateVocab(['meeting', 'project', 'deadline'], (done, total) => {
//   console.log(`Processed ${done}/${total}`)
// })

// ============================================
// 3. FILTERING AND SEARCHING VOCAB
// ============================================

export async function searchVocab(
  userId: string,
  searchTerm: string,
  category: 'work' | 'general' = 'work'
) {
  const vocabRef = collection(db, 'users', userId, 'vocab')

  // Search by original term (case-insensitive requires compound index)
  const q = query(
    vocabRef,
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)
  const allCards = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Client-side filter for more flexible searching
  return allCards.filter(
    (card) =>
      card.originalTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.germanTerm.toLowerCase().includes(searchTerm.toLowerCase())
  )
}

// ============================================
// 4. EXPORT VOCAB TO CSV
// ============================================

export function exportVocabToCSV(
  vocabCards: Array<any>,
  filename = 'deincontext-vocab.csv'
) {
  const headers = [
    'English',
    'German',
    'Article',
    'Plural',
    'Example Sentence',
    'Category',
    'Created Date',
  ]

  const rows = vocabCards.map((card) => [
    card.originalTerm,
    card.germanTerm,
    card.article,
    card.plural,
    card.exampleSentence,
    card.category,
    new Date(card.createdAt.toDate()).toLocaleDateString(),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

// Usage:
// const vocab = await fetchUserVocab(userId)
// exportVocabToCSV(vocab)

// ============================================
// 5. SPACED REPETITION ALGORITHM
// ============================================

interface ReviewCard extends VocabCard {
  id: string
}

export function calculateNextReview(
  difficulty: 'easy' | 'medium' | 'hard'
): Timestamp {
  const now = Date.now()
  let daysToAdd = 1

  switch (difficulty) {
    case 'easy':
      daysToAdd = 7 // Review in 7 days
      break
    case 'medium':
      daysToAdd = 3 // Review in 3 days
      break
    case 'hard':
      daysToAdd = 1 // Review tomorrow
      break
  }

  const nextReviewDate = new Date(now + daysToAdd * 24 * 60 * 60 * 1000)
  return Timestamp.fromDate(nextReviewDate)
}

export async function getReviewCards(userId: string): Promise<ReviewCard[]> {
  const vocabRef = collection(db, 'users', userId, 'vocab')
  const now = Timestamp.now()

  const q = query(
    vocabRef,
    where('nextReview', '<=', now),
    orderBy('nextReview', 'asc'),
    limit(10)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ReviewCard[]
}

// ============================================
// 6. CUSTOM GEMINI PROMPTS
// ============================================

// If you want to generate different types of content,
// create separate Server Actions

// Example: Business Email Generator
export async function generateBusinessEmail(germanTerm: string) {
  // Similar to generateVocabData, but with different prompt
  const prompt = `
Generate a professional business email in German that uses the term: ${germanTerm}
Return JSON: {
  "subject": "email subject in German",
  "greeting": "formal greeting",
  "body": "email body paragraph",
  "closing": "professional closing"
}
`
  // Call Gemini...
}

// ============================================
// 7. ERROR HANDLING PATTERNS
// ============================================

export async function generateWithRetry(
  term: string,
  maxRetries = 3
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await generateVocabData(term)
      if (response.success) return response

      if (attempt === maxRetries) return response // Last attempt failed
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Failed after ${maxRetries} attempts: ${error}`,
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      )
    }
  }

  return { success: false, error: 'Unknown error' }
}

// ============================================
// 8. ANALYTICS & STATS
// ============================================

export async function getUserVocabStats(userId: string) {
  const vocabRef = collection(db, 'users', userId, 'vocab')
  const snapshot = await getDocs(vocabRef)

  const cards = snapshot.docs.map((doc) => doc.data())

  return {
    totalCards: cards.length,
    workCards: cards.filter((c) => c.category === 'work').length,
    generalCards: cards.filter((c) => c.category === 'general').length,
    cardsToReview: cards.filter((c) => c.nextReview <= Timestamp.now()).length,
    oldestCard: Math.min(
      ...cards.map((c) => c.createdAt.toDate().getTime())
    ),
    newestCard: Math.max(
      ...cards.map((c) => c.createdAt.toDate().getTime())
    ),
  }
}

// ============================================
// END ADVANCED EXAMPLES
// ============================================
