'use client'

import { useState } from 'react'
import { useVocabGenerator } from '@/hooks/useVocabGenerator'
import { VocabCardInput } from '@/types/vocab'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function VocabForm() {
  const [inputValue, setInputValue] = useState('')
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const vocabData = await generateData(inputValue)
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
          <div className="relative">
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
}

function VocabDataDisplay({
  data,
  onSave,
  onCancel,
  isSaving,
}: VocabDataDisplayProps) {
  const [editableData, setEditableData] = useState(data)

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
          <select
            value={editableData.category}
            onChange={(e) =>
              setEditableData({ ...editableData, category: e.target.value as any })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="work">work</option>
            <option value="general">general</option>
          </select>
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
            'Save to Firestore'
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
