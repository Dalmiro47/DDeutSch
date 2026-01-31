import { Timestamp } from 'firebase/firestore'

export interface VocabCard {
  originalTerm: string
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
  englishSentence: string // <--- NEW FIELD
  category: 'work' | 'general'
  nextReview: Timestamp
  createdAt: Timestamp
}

export interface VocabCardInput {
  originalTerm: string
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
  englishSentence: string // <--- NEW FIELD
  category: 'work' | 'general'
}

export interface ServerActionResponse {
  success: boolean
  data?: VocabCardInput
  error?: {
    code: string
    message: string
  }
}

export interface GeminiResponse {
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
  englishSentence: string // <--- NEW FIELD
}

export interface GeminiResponse {
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
}
