import { Timestamp } from 'firebase/firestore'

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface VocabCard {
  originalTerm: string
  germanTerm: string
  article: 'der' | 'die' | 'das' | 'none'
  plural: string
  exampleSentence: string
  englishSentence: string // <--- NEW FIELD
  category: string
  cefrLevel: CefrLevel // <--- Add this
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
  category: string
  cefrLevel: CefrLevel // <--- Add this
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
