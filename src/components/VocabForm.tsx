'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useVocabGenerator } from '@/hooks/useVocabGenerator'
import { VocabCardInput } from '@/types/vocab'
import { Loader2, CheckCircle2, AlertCircle, Plus, Wand2 } from 'lucide-react'
import { db } from '@/lib/firebase'

export function VocabForm() {
  const [inputValue, setInputValue] = useState('')
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B1')
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [isManualEntry, setIsManualEntry] = useState(false)

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

    setIsManualEntry(false)
    const vocabData = await generateData(inputValue, cefrLevel)
    if (!vocabData) {
      return
    }
  }

  const handleManualEntry = () => {
    resetState()
    setIsManualEntry(true)
  }

  const handleSave = async (editedData: VocabCardInput) => {
    if (!editedData) return

    const savedId = await saveToFirestore(editedData, false)
    if (savedId) {
      setInputValue('')
      setTimeout(() => {
        resetState()
        setIsManualEntry(false)
      }, 2000)
    }
  }

  const handleOverwrite = async () => {
    if (!generatedData && !isManualEntry) return
    const dataToSave = generatedData || manualData
    if (dataToSave) {
      const savedId = await saveToFirestore(dataToSave, true)
      if (savedId) {
        setInputValue('')
        setTimeout(() => {
          resetState()
          setIsManualEntry(false)
        }, 2000)
      }
    }
  }

  const handleReset = () => {
    setInputValue('')
    setIsManualEntry(false)
    resetState()
  }

  const manualData: VocabCardInput = {
    originalTerm: inputValue,
    germanTerm: '',
    article: 'none',
    plural: '',
    exampleSentence: '',
    englishSentence: '',
    category: 'work',
    cefrLevel: cefrLevel,
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8 space-y-8">
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="english-term"
            className="block w-full text-xs font-bold uppercase tracking-wider text-muted-foreground text-center"
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
                className="w-full px-6 py-4 text-xs sm:text-sm border border-input rounded-xl bg-background/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-xs sm:placeholder:text-sm placeholder:text-muted-foreground/40"
              />
            </div>

            <select
              value={cefrLevel}
              onChange={(e) => setCefrLevel(e.target.value as any)}
              className="w-full sm:w-auto px-4 py-4 border border-input rounded-xl bg-background/50 font-bold text-muted-foreground text-center [text-align-last:center] sm:text-left sm:[text-align-last:auto] focus:ring-2 focus:ring-primary/20"
            >
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Card
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleManualEntry}
            disabled={isLoading}
            className="flex-1 py-4 bg-card border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground rounded-xl font-bold text-lg hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Card
          </button>
        </div>
      </form>

      {error && (
        <div className={`p-4 rounded-lg flex gap-3 ${error === 'DUPLICATE_CARD' ? 'bg-amber-50 border border-amber-200' : 'bg-destructive/10 border border-destructive/30'}`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${error === 'DUPLICATE_CARD' ? 'text-amber-600' : 'text-destructive'}`} />
          <div className="flex-1">
            {error === 'DUPLICATE_CARD' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-amber-800">Card already exists!</p>
                  <p className="text-sm text-amber-700">Would you like to overwrite it with this new version?</p>
                </div>
                <button
                  onClick={handleOverwrite}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                >
                  Overwrite Card
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(generatedData || isManualEntry) && !savedVocabId && (
        <VocabDataDisplay
          key={isManualEntry ? 'manual' : 'generated'}
          data={generatedData || manualData}
          onSave={handleSave}
          onCancel={handleReset}
          isSaving={isSaving}
          existingCategories={existingCategories}
          isCustomCategory={isCustomCategory}
          setIsCustomCategory={setIsCustomCategory}
          title={isManualEntry ? 'Create New Card' : 'Generated Data (Editable)'}
        />
      )}

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
  title?: string
}

function VocabDataDisplay({
  data,
  onSave,
  onCancel,
  isSaving,
  existingCategories,
  isCustomCategory,
  setIsCustomCategory,
  title = 'Generated Data (Editable)',
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
    <div className="p-6 bg-card border border-border rounded-lg space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Original Term (English)
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
          Example Sentence (German)
        </label>
        <textarea
          value={editableData.exampleSentence}
          onChange={(e) =>
            setEditableData({ ...editableData, exampleSentence: e.target.value })
          }
          className="w-full px-3 py-2 bg-background border border-input rounded text-foreground italic focus:outline-none focus:ring-2 focus:ring-ring min-h-20 resize-none"
        />
      </div>

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
