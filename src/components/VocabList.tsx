'use client'

import { useEffect, useState } from 'react'
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { VocabCard, VocabCardInput } from '@/types/vocab'
import { Trash2, Calendar, BookOpen, GraduationCap, RefreshCw, Search, Filter, Volume2, ChevronDown, Edit, Check, X, Info } from 'lucide-react'
import { useVocabGenerator } from '@/hooks/useVocabGenerator'

// Helper for Article Colors
const getArticleColor = (article: string) => {
  switch (article.toLowerCase()) {
    case 'der':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    case 'die':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    case 'das':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}

export function VocabList() {
  const [vocabCards, setVocabCards] = useState<(VocabCard & { id: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Study Mode State
  const [isStudyMode, setIsStudyMode] = useState(false)
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<VocabCardInput | null>(null)
  
  // Hover State for Translation (The Fix)
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null)

  const { updateVocabCard } = useVocabGenerator()

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'work' | 'general'>('all')

  useEffect(() => {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      setError('User not authenticated')
      setIsLoading(false)
      return
    }

    try {
      const vocabRef = collection(db, 'users', user.uid, 'vocab')
      const q = query(vocabRef)
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cards: (VocabCard & { id: string })[] = []
        snapshot.forEach((docSnapshot) => {
          cards.push({ ...(docSnapshot.data() as VocabCard), id: docSnapshot.id })
        })
        cards.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
        setVocabCards(cards)
        setIsLoading(false)
      }, (err) => {
        setError(err.message)
        setIsLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }, [])

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation() 
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE' 
      utterance.rate = 0.9 
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleDelete = async (e: React.MouseEvent, vocabId: string) => {
    e.stopPropagation()
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) return

    if (!confirm('Are you sure you want to delete this card?')) return

    setDeletingId(vocabId)
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'vocab', vocabId))
    } catch (err) {
      console.error("Error deleting document:", err)
      alert("Failed to delete card")
    } finally {
      setDeletingId(null)
    }
  }

  // --- EDIT HANDLERS ---
  const startEditing = (e: React.MouseEvent, card: VocabCard & { id: string }) => {
    e.stopPropagation()
    setEditingId(card.id)
    setEditForm({
      originalTerm: card.originalTerm,
      germanTerm: card.germanTerm,
      article: card.article,
      plural: card.plural,
      exampleSentence: card.exampleSentence,
      englishSentence: card.englishSentence || '',
      category: card.category,
    })
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (!editForm) return

    try {
      await updateVocabCard(docId, editForm)
      setEditingId(null)
      setEditForm(null)
    } catch (err) {
      alert("Failed to update card")
      console.error(err)
    }
  }

  const filteredCards = vocabCards.filter((card) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      card.originalTerm.toLowerCase().includes(searchLower) ||
      card.germanTerm.toLowerCase().includes(searchLower) ||
      card.exampleSentence.toLowerCase().includes(searchLower)
    const matchesCategory = categoryFilter === 'all' || card.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleCardClick = (id: string) => {
    if (!isStudyMode) return
    if (editingId === id) return 

    const newRevealed = new Set(revealedCardIds)
    if (newRevealed.has(id)) {
      newRevealed.delete(id)
    } else {
      newRevealed.add(id)
    }
    setRevealedCardIds(newRevealed)
  }

  const toggleStudyMode = () => {
    setIsStudyMode(!isStudyMode)
    setRevealedCardIds(new Set())
    setEditingId(null)
    setHoveredSentenceId(null) // Reset hovers
  }

  const formatPlural = (pluralText: string) => {
    return pluralText.replace(/^die\s+/i, '')
  }

  if (isLoading) return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading collection...</div>
  if (error) return <div className="text-center py-10 text-destructive">Error: {error}</div>

  if (vocabCards.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No vocabulary cards yet.</p>
        <p className="text-sm text-muted-foreground/80">Generate your first word above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            Your Collection 
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({filteredCards.length}{filteredCards.length !== vocabCards.length && ` of ${vocabCards.length}`})
            </span>
          </h2>
          
          <button
            onClick={toggleStudyMode}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${
              isStudyMode 
                ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {isStudyMode ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Exit Study Mode
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                Start Study Mode
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search English, German, or context..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>

          <div className="relative group min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors z-10" />
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full pl-10 pr-10 py-3 bg-card border border-input rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm cursor-pointer hover:bg-muted/50 text-foreground"
            >
              <option value="all">All Categories</option>
              <option value="work">Work Only</option>
              <option value="general">General Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCards.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border/50">
            No cards match your search criteria.
          </div>
        ) : (
          filteredCards.map((card) => {
            const isRevealed = revealedCardIds.has(card.id)
            const showAnswer = !isStudyMode || isRevealed
            const isEditing = editingId === card.id
            const isHovered = hoveredSentenceId === card.id // Check hover state

            // --- RENDER EDIT FORM ---
            if (isEditing && editForm) {
              return (
                <div key={card.id} className="p-5 border border-primary/50 ring-1 ring-primary/20 rounded-xl bg-card shadow-lg space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">English</label>
                    <input 
                      className="w-full p-2 text-sm border rounded bg-background"
                      value={editForm.originalTerm}
                      onChange={(e) => setEditForm({...editForm, originalTerm: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/3 space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Art.</label>
                      <select 
                        className="w-full p-2 text-sm border rounded bg-background"
                        value={editForm.article}
                        onChange={(e) => setEditForm({...editForm, article: e.target.value as any})}
                      >
                         <option value="der">der</option><option value="die">die</option><option value="das">das</option><option value="none">none</option>
                      </select>
                    </div>
                    <div className="w-2/3 space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">German</label>
                      <input 
                        className="w-full p-2 text-sm border rounded font-bold bg-background"
                        value={editForm.germanTerm}
                        onChange={(e) => setEditForm({...editForm, germanTerm: e.target.value})}
                      />
                    </div>
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Plural</label>
                    <input 
                      className="w-full p-2 text-sm border rounded bg-background"
                      value={editForm.plural}
                      onChange={(e) => setEditForm({...editForm, plural: e.target.value})}
                    />
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Sentence</label>
                    <textarea 
                      className="w-full p-2 text-sm border rounded resize-none bg-background"
                      rows={2}
                      value={editForm.exampleSentence}
                      onChange={(e) => setEditForm({...editForm, exampleSentence: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Translation</label>
                    <textarea 
                      className="w-full p-2 text-sm border rounded resize-none bg-background"
                      rows={2}
                      value={editForm.englishSentence || ''}
                      onChange={(e) => setEditForm({...editForm, englishSentence: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={(e) => saveEdit(e, card.id)} className="flex-1 bg-primary text-primary-foreground text-xs py-2 rounded flex items-center justify-center gap-1 hover:bg-primary/90">
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button onClick={(e) => cancelEditing(e)} className="flex-1 bg-secondary text-secondary-foreground text-xs py-2 rounded flex items-center justify-center gap-1 hover:bg-secondary/90">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              )
            }

            // --- RENDER CARD VIEW ---
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  group relative p-5 border rounded-xl bg-card transition-all duration-300
                  ${isStudyMode ? 'cursor-pointer hover:shadow-lg active:scale-95' : 'hover:-translate-y-0.5'}
                  ${isStudyMode && !isRevealed ? 'border-dashed border-primary/30 bg-primary/5' : 'border-border'}
                `}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <span className={`
                    font-bold uppercase tracking-wider transition-all duration-300
                    ${isStudyMode && !isRevealed ? 'text-lg text-primary mx-auto pt-8 pb-8 scale-110' : 'text-[10px] text-muted-foreground'}
                  `}>
                    {card.originalTerm}
                  </span>

                  {(!isStudyMode || isRevealed) && (
                    <div className="flex gap-1">
                      {/* Buttons always visible for better UX */}
                      <button
                        onClick={(e) => startEditing(e, card)}
                        className="p-1.5 hover:bg-primary/10 rounded-md text-muted-foreground hover:text-primary transition-all"
                        title="Edit Card"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => handleDelete(e, card.id)}
                        disabled={deletingId === card.id}
                        className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-all"
                        title="Delete Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ANSWER SECTION */}
                <div className={`transition-all duration-300 ${showAnswer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {card.article !== 'none' && (
                        <span className={`px-2.5 py-0.5 rounded-md text-sm font-bold border shadow-sm ${getArticleColor(card.article)}`}>
                          {card.article}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-foreground tracking-tight">
                        {card.germanTerm}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => handleSpeak(e, `${card.article !== 'none' ? card.article : ''} ${card.germanTerm}`)}
                      className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:scale-110 transition-all active:scale-95"
                      title="Listen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground/60 text-xs w-10">Plural</span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                        die
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPlural(card.plural)}
                      </span>
                    </div>

                    {/* Example Sentence with RELIABLE Hover AND Click (Mobile) */}
                    <div 
                      className="relative bg-muted/50 p-3 rounded-lg border border-border/50 cursor-help"
                      onMouseEnter={() => setHoveredSentenceId(card.id)}
                      onMouseLeave={() => setHoveredSentenceId(null)}
                      // 👇 ADD THIS CLICK HANDLER FOR MOBILE SUPPORT
                      onClick={(e) => {
                        e.stopPropagation() // Prevent card flip
                        // Toggle: If open, close it. If closed, open it.
                        setHoveredSentenceId(hoveredSentenceId === card.id ? null : card.id)
                      }}
                    >
                      <div className="flex items-start justify-between pointer-events-none">
                         <p className="text-sm italic text-foreground/80 leading-relaxed underline decoration-dotted decoration-primary/30 underline-offset-4">
                           &quot;{card.exampleSentence}&quot;
                         </p>
                         <Info className="w-3 h-3 text-muted-foreground/30 ml-2 mt-1 flex-shrink-0" />
                      </div>
                      
                      {/* React State Controlled Tooltip (100% Reliability) */}
                      {isHovered && (
                        <div className="absolute left-0 -top-2 -translate-y-full w-full z-50 px-2 pb-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-popover text-popover-foreground text-xs p-3 rounded-md shadow-xl border border-border/50 backdrop-blur-md relative">
                            {/* Tiny arrow pointing down */}
                            <div className="absolute bottom-0 left-6 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b border-border/50"></div>
                            {card.englishSentence || "No translation available for this card."}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground/60 border-t border-border/40 mt-3">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {new Date(card.createdAt.toDate()).toLocaleDateString()}
                      </div>
                      <span className="uppercase tracking-wider opacity-70 border border-border rounded px-1.5 py-0.5">
                        {card.category}
                      </span>
                    </div>
                  </div>
                </div>

                {isStudyMode && !isRevealed && (
                  <div className="absolute inset-x-0 bottom-4 text-center">
                    <span className="text-xs font-medium text-primary/60 animate-pulse">
                      Tap to reveal
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}