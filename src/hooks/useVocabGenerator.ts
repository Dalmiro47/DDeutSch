'use client'

import { useState, useCallback } from 'react'
import {
  collection,
  setDoc,
  doc,
  getDoc,
  updateDoc, // <--- Added updateDoc
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { generateVocabData } from '@/app/actions/generateVocab'
import { VocabCard, VocabCardInput } from '@/types/vocab'

interface UseVocabGeneratorState {
  isLoading: boolean
  isGenerating: boolean
  isSaving: boolean
  error: string | null
  generatedData: VocabCardInput | null
  savedVocabId: string | null
}

export function useVocabGenerator() {
  const [state, setState] = useState<UseVocabGeneratorState>({
    isLoading: false,
    isGenerating: false,
    isSaving: false,
    error: null,
    generatedData: null,
    savedVocabId: null,
  })

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      isGenerating: false,
      isSaving: false,
      error: null,
      generatedData: null,
      savedVocabId: null,
    })
  }, [])

  const generateData = useCallback(
    async (englishTerm: string): Promise<VocabCardInput | null> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        isGenerating: true,
        error: null,
        generatedData: null,
      }))

      try {
        const response = await generateVocabData(englishTerm)

        if (!response.success || !response.data) {
          const errorMessage =
            response.error?.message || 'Unknown error occurred'
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isGenerating: false,
            error: errorMessage,
          }))
          return null
        }

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          generatedData: response.data,
        }))

        return response.data
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate vocab'
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isGenerating: false,
          error: errorMessage,
        }))
        return null
      }
    },
    []
  )

  const saveToFirestore = useCallback(
    async (vocabData: VocabCardInput): Promise<string | null> => {
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        const errorMessage = 'User not authenticated'
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSaving: false,
          error: errorMessage,
        }))
        return null
      }

      setState((prev) => ({
        ...prev,
        isSaving: true,
        error: null,
      }))

      try {
        // Use the original term as the document ID
        // Trim whitespace to avoid "project " vs "project" issues
        const docId = vocabData.originalTerm.trim()
        
        // Reference to the specific document (users/{uid}/vocab/{term})
        const docRef = doc(db, 'users', user.uid, 'vocab', docId)

        // Optimized duplicate check - read single doc instead of querying collection
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const errorMessage = `You already have a card for "${vocabData.originalTerm}"!`
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isSaving: false,
            error: errorMessage,
          }))
          return null
        }

        // Add timestamps
        const now = Timestamp.now()
        const nextReviewTimestamp = Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000) // +24 hours
        )

        const finalVocabCard: VocabCard = {
          ...vocabData,
          createdAt: now,
          nextReview: nextReviewTimestamp,
        }

        // Write with specific document ID using setDoc
        await setDoc(docRef, finalVocabCard)

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSaving: false,
          savedVocabId: docId,
        }))

        return docId
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to save vocab to Firestore'
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSaving: false,
          error: errorMessage,
          generatedData: null,
        }))
        return null
      }
    },
    []
  )

  const generateAndSave = useCallback(
    async (englishTerm: string): Promise<string | null> => {
      const vocabData = await generateData(englishTerm)
      if (!vocabData) return null
      const savedId = await saveToFirestore(vocabData)
      return savedId
    },
    [generateData, saveToFirestore]
  )

  // NEW: Update Function for Editing
  const updateVocabCard = useCallback(
    async (docId: string, updatedData: Partial<VocabCardInput>) => {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) throw new Error('User not authenticated')

      const docRef = doc(db, 'users', user.uid, 'vocab', docId)
      await updateDoc(docRef, updatedData)
    },
    []
  )

  return {
    ...state,
    generateData,
    saveToFirestore,
    updateVocabCard, // <--- Export the new function
    generateAndSave,
    resetState,
  }
}
