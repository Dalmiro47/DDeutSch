import { Timestamp } from 'firebase/firestore'

export type ReviewDifficulty = 'very_hard' | 'hard' | 'medium' | 'easy'

export function calculateNextReview(difficulty: ReviewDifficulty): Timestamp {
  const now = Date.now()
  let addedMillis = 0

  switch (difficulty) {
    case 'easy':
      addedMillis = 7 * 24 * 60 * 60 * 1000 // 7 days
      break
    case 'medium':
      addedMillis = 3 * 24 * 60 * 60 * 1000 // 3 days
      break
    case 'hard':
      addedMillis = 1 * 24 * 60 * 60 * 1000 // 1 day
      break
    case 'very_hard':
      addedMillis = 10 * 60 * 1000 // 10 minutes (Again)
      break
  }

  return Timestamp.fromDate(new Date(now + addedMillis))
}
