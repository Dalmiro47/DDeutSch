'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useVocabGenerator } from '@/hooks/useVocabGenerator'
import { VocabCardInput } from '@/types/vocab'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { db } from '@/lib/firebase'

export function VocabForm() {
  const [inputValue, setInputValue] = useState('')
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B1')
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const {
    isLoading,
    isGenerating,
    isSaving,
    error,
    generatedData,
    savedVocabId,
    generateData,
    saveToFirestore,
    resetState,
  } = useVocabGenerator()

  useEffect(() => {
    let isMounted = true

    const fetchCategories = async () => {
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        if (isMounted) {
          setExistingCategories([])
          setIsCustomCategory(true)
        }
        return
      }

      try {
        const vocabRef = collection(db, 'users', user.uid, 'vocab')
        const snapshot = await getDocs(vocabRef)
        const categories = Array.from(
          new Set(
            snapshot.docs
              .map((docSnapshot) => (docSnapshot.data() as { category?: string }).category)
              .filter((category): category is string => Boolean(category && category.trim()))
          )
        ).sort((a, b) => a.localeCompare(b))

        if (isMounted) {
          setExistingCategories(categories)
          setIsCustomCategory(categories.length === 0)
        }
      } catch {
        if (isMounted) {
          setExistingCategories([])
          setIsCustomCategory(true)
        }
      }
    }

    fetchCategories()

    return () => {
      isMounted = false
    }
  }, [savedVocabId])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const vocabData = await generateData(inputValue, cefrLevel)
    if (!vocabData) {
      // Error is already set in the hook state
      return
    }
  }

  const handleSave = async (editedData: VocabCardInput) => {
    if (!editedData) return

    const savedId = await saveToFirestore(editedData)
    if (savedId) {
      setInputValue('')
      // Reset after a short delay to show success
      setTimeout(() => {
        resetState()
      }, 2000)
    }
  }

  const handleReset = () => {
    setInputValue('')
    resetState()
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8 space-y-8">
      {/* Form Section - Modernized Input */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="english-term"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
          >
            New Term
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="english-term"
                type="text"
                placeholder="Enter an English word (e.g., meeting)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="w-full px-6 py-4 text-lg border border-input rounded-xl bg-background/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40"
              />
            </div>

            <select
              value={cefrLevel}
              onChange={(e) => setCefrLevel(e.target.value as any)}
              className="px-4 py-4 border border-input rounded-xl bg-background/50 font-bold text-muted-foreground focus:ring-2 focus:ring-primary/20"
            >
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Translating...
            </>
          ) : (
            'Generate Context Card'
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Data Display */}
      {generatedData && !savedVocabId && (
        <VocabDataDisplay
          data={generatedData}
          onSave={handleSave}
          onCancel={handleReset}
          isSaving={isSaving}
          existingCategories={existingCategories}
          isCustomCategory={isCustomCategory}
          setIsCustomCategory={setIsCustomCategory}
        />
      )}

      {/* Success Message */}
      {savedVocabId && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              Vocabulary saved successfully!
            </p>
            <p className="text-sm text-green-800 dark:text-green-300">
              ID: {savedVocabId}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

interface VocabDataDisplayProps {
  data: VocabCardInput
  onSave: (editedData: VocabCardInput) => void
  onCancel: () => void
  isSaving: boolean
  existingCategories: string[]
  isCustomCategory: boolean
  setIsCustomCategory: (value: boolean) => void
}

function VocabDataDisplay({
  data,
  onSave,
  onCancel,
  isSaving,
  existingCategories,
  isCustomCategory,
  setIsCustomCategory,
}: VocabDataDisplayProps) {
  const [editableData, setEditableData] = useState(data)
  const hasExistingCategories = existingCategories.length > 0

  useEffect(() => {
    if (!hasExistingCategories || isCustomCategory) return
    if (!existingCategories.includes(editableData.category)) {
      setEditableData((prev) => ({
        ...prev,
        category: existingCategories[0] || '',
      }))
    }
  }, [editableData.category, existingCategories, hasExistingCategories, isCustomCategory])

  const handleSaveClick = () => {
    onSave(editableData)
  }

  return (
    <div className="p-6 bg-card border border-border rounded-lg space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Generated Data (Editable)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Original Term
          </label>
          <input
            type="text"
            value={editableData.originalTerm}
            onChange={(e) =>
              setEditableData({ ...editableData, originalTerm: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            German Term
          </label>
          <input
            type="text"
            value={editableData.germanTerm}
            onChange={(e) =>
              setEditableData({ ...editableData, germanTerm: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Article
          </label>
          <select
            value={editableData.article}
            onChange={(e) =>
              setEditableData({ ...editableData, article: e.target.value as any })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="der">der</option>
            <option value="die">die</option>
            <option value="das">das</option>
            <option value="none">none</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Plural
          </label>
          <input
            type="text"
            value={editableData.plural}
            onChange={(e) =>
              setEditableData({ ...editableData, plural: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Category
          </label>
          {hasExistingCategories && !isCustomCategory ? (
            <select
              value={
                existingCategories.includes(editableData.category)
                  ? editableData.category
                  : existingCategories[0]
              }
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  setIsCustomCategory(true)
                  return
                }
                setEditableData({ ...editableData, category: e.target.value })
              }}
              className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {existingCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="__add_new__">+ Add New Category</option>
            </select>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={editableData.category}
                onChange={(e) =>
                  setEditableData({ ...editableData, category: e.target.value })
                }
                placeholder="e.g. Work, Travel, Food..."
                className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {hasExistingCategories && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false)
                    setEditableData((prev) => ({
                      ...prev,
                      category: existingCategories[0] || prev.category,
                    }))
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Use existing category
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <label className="text-sm font-medium text-muted-foreground">
          Example Sentence
        </label>
        <textarea
          value={editableData.exampleSentence}
          onChange={(e) =>
            setEditableData({ ...editableData, exampleSentence: e.target.value })
          }
          className="w-full px-3 py-2 bg-background border border-input rounded text-foreground italic focus:outline-none focus:ring-2 focus:ring-ring min-h-20 resize-none"
        />
      </div>

      {/* NEW: English Sentence Input */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">
          English Translation
        </label>
        <textarea
          value={editableData.englishSentence || ''}
          onChange={(e) =>
            setEditableData({ ...editableData, englishSentence: e.target.value })
          }
          placeholder="Translation unavailable (edit to add)"
          className="w-full px-3 py-2 bg-background border border-input rounded text-foreground/80 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-16 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
