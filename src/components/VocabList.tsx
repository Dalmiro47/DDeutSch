'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, query, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { VocabCard, VocabCardInput } from '@/types/vocab'
import { Trash2, Calendar, BookOpen, GraduationCap, Search, Filter, Volume2, ChevronDown, Edit, Check, X, PlusCircle, LogOut, Square } from 'lucide-react'
import { useVocabGenerator } from '@/hooks/useVocabGenerator'
import { calculateNextReview, ReviewDifficulty } from '@/lib/spacedRepetition'

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

const getLevelBadgeColor = (level: string = 'B1') => {
  if (level === 'A1') return 'bg-green-100 text-green-800'
  if (level === 'A2') return 'bg-emerald-100 text-emerald-800'
  if (level === 'B1') return 'bg-blue-100 text-blue-800'
  if (level === 'B2') return 'bg-purple-100 text-purple-800'
  if (level === 'C1') return 'bg-rose-100 text-rose-800'
  return 'bg-gray-100 text-gray-800'
}

const stripLeadingArticle = (term: string, article: string) => {
  if (!term || !article || article === 'none') return term
  const prefix = `${article.toLowerCase()} `
  if (term.toLowerCase().startsWith(prefix)) {
    return term.slice(prefix.length)
  }
  return term
}

const selectNextCardId = (cards: (VocabCard & { id: string })[]) => {
  const phase1 = cards.filter((card) => (card.learningStep ?? 0) === 0)
  const phase2 = cards.filter((card) => card.learningStep === 1)
  const phase3 = cards.filter((card) => card.learningStep === 2)

  let activeDeck: (VocabCard & { id: string })[] = []
  if (phase1.length > 0) activeDeck = phase1
  else if (phase2.length > 0) activeDeck = phase2
  else activeDeck = phase3

  if (activeDeck.length === 0) return null

  const randomIndex = Math.floor(Math.random() * activeDeck.length)
  return activeDeck[randomIndex].id
}

const formatPlural = (pluralText: string) => {
  return pluralText.replace(/^die\s+/i, '')
}

export function VocabList() {
  const [vocabCards, setVocabCards] = useState<(VocabCard & { id: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Study Mode State
  const [isStudyMode, setIsStudyMode] = useState(false)
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null)

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<VocabCardInput | null>(null)
  
  // Hover State for Translation (The Fix)
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null)

  const { updateVocabCard } = useVocabGenerator()

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [cefrFilter, setCefrFilter] = useState<string>('all')

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
      return
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const handleAudioControl = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation()

    if (playingAudioKey === key) {
      window.speechSynthesis.cancel()
      setPlayingAudioKey(null)
      return
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = 0.9

      utterance.onend = () => setPlayingAudioKey(null)
      utterance.onerror = () => setPlayingAudioKey(null)

      setPlayingAudioKey(key)
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
      cefrLevel: card.cefrLevel || 'B1',
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

  const uniqueCategories = Array.from(
    new Set(vocabCards.map((card) => card.category || 'general'))
  ).sort()

  const uniqueLevels = Array.from(
    new Set(vocabCards.map((card) => card.cefrLevel || 'B1'))
  ).sort()

  const baseFilteredCards = vocabCards.filter((card) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      card.originalTerm.toLowerCase().includes(searchLower) ||
      card.germanTerm.toLowerCase().includes(searchLower) ||
      card.exampleSentence.toLowerCase().includes(searchLower)
    const matchesCategory = categoryFilter === 'all' || card.category === categoryFilter
    const matchesCefr = cefrFilter === 'all' || (card.cefrLevel || 'B1') === cefrFilter
    return matchesSearch && matchesCategory && matchesCefr
  })

  const dueCards = baseFilteredCards.filter((card) => {
    if (card.id === isUpdatingId) return false

    if (!card.nextReview) return true

    const isLearning = card.learningStep !== undefined && card.learningStep !== null

    if (isLearning) {
      return card.nextReview.toDate() <= currentTime
    }

    const reviewDate = card.nextReview.toDate()
    const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate())
    const currentDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate())

    return reviewDay <= currentDay
  })

  const filteredCards = baseFilteredCards

  const visibleCount = isStudyMode ? dueCards.length : filteredCards.length

  useEffect(() => {
    if (isStudyMode && !activeCardId && dueCards.length > 0) {
      const nextId = selectNextCardId(dueCards)
      if (nextId) setActiveCardId(nextId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudyMode, activeCardId, dueCards.length, selectNextCardId])

  const currentCard = useMemo(() => {
    if (activeCardId === isUpdatingId) return null
    return vocabCards.find((card) => card.id === activeCardId) || null
  }, [activeCardId, vocabCards, isUpdatingId])

  const handleCardClick = (id: string) => {
    if (!isStudyMode) return
    if (editingId === id) return 

    const isThisCardRevealed = revealedCardIds.has(id)

    const newRevealed = new Set(revealedCardIds)
    if (isThisCardRevealed) {
      newRevealed.delete(id)
    } else {
      newRevealed.clear()
      newRevealed.add(id)
    }
    setRevealedCardIds(newRevealed)
  }

  const toggleStudyMode = () => {
    setIsStudyMode(!isStudyMode)
    setRevealedCardIds(new Set())
    setActiveCardId(null)
    setEditingId(null)
    setHoveredSentenceId(null) // Reset hovers
  }

  const handleRating = async (
    e: React.MouseEvent,
    cardId: string,
    difficulty: ReviewDifficulty
  ) => {
    e.stopPropagation()
    setIsUpdatingId(cardId)
    setActiveCardId(null)
    const scrollY = typeof window !== 'undefined' ? window.scrollY : null

    const card = vocabCards.find((item) => item.id === cardId)
    if (!card) return

    const currentStep = card.learningStep ?? 0

    try {
      if (difficulty === 'very_hard') {
        await updateVocabCard(cardId, {
          nextReview: Timestamp.fromMillis(Date.now() - 60000),
          learningStep: 0,
        })
        return
      }

      if (currentStep < 2) {
        await updateVocabCard(cardId, {
          nextReview: Timestamp.fromMillis(Date.now() - 60000),
          learningStep: currentStep + 1,
        })
        return
      }

      const nextReview = calculateNextReview(difficulty)
      await updateVocabCard(cardId, {
        nextReview,
        learningStep: null as any,
      })

      setRevealedCardIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    } catch (error) {
      console.error("Rating failed:", error)
    } finally {
      setTimeout(() => {
        setIsUpdatingId(null)
        if (scrollY !== null) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY })
          })
        }
      }, 500)
    }
  }

  const getRoundLabel = (card: VocabCard & { id: string }) => {
    const step = card.learningStep ?? 0
    if (step >= 2) return 'Final Round'
    return `Round ${step + 1}/3`
  }

  const handleSkipLoop = async (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation()
    setIsUpdatingId(cardId)
    setActiveCardId(null)
    const scrollY = typeof window !== 'undefined' ? window.scrollY : null
    try {
      const nextReview = calculateNextReview('medium')
      await updateVocabCard(cardId, { nextReview, learningStep: null as any })

      setRevealedCardIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    } catch (error) {
      console.error("Failed to skip loop", error)
      alert("Failed to save progress")
    } finally {
      setTimeout(() => {
        setIsUpdatingId(null)
        if (scrollY !== null) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY })
          })
        }
      }, 500)
    }
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
    <div className="space-y-6 relative z-0">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            Your Collection 
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({visibleCount}{!isStudyMode && filteredCards.length !== vocabCards.length && ` of ${vocabCards.length}`})
            </span>
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleStudyMode}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                isStudyMode
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary/80 text-primary-foreground hover:bg-primary hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isStudyMode ? (
                <>
                  <LogOut className="w-4 h-4" />
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
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search English, German, or context..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isStudyMode}
              className={`w-full pl-10 pr-4 py-3 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm bg-card border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm ${
                isStudyMode ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="relative group min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-card border border-input rounded-xl appearance-none cursor-pointer hover:bg-muted/50"
            >
              <option value="all">All Topics</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative group min-w-[100px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground z-10">Lvl</div>
            <select 
              value={cefrFilter} 
              onChange={(e) => setCefrFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-card border border-input rounded-xl appearance-none cursor-pointer hover:bg-muted/50"
            >
              <option value="all">All</option>
              {uniqueLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
            const isHovered = hoveredSentenceId === card.id // Check hover state
            const isAnyRevealed = revealedCardIds.size > 0
            const isThisRevealed = revealedCardIds.has(card.id)
            const isDimmed = !isStudyMode && isAnyRevealed && !isThisRevealed

            // --- RENDER CARD VIEW ---
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  group relative p-5 border rounded-xl bg-card transition-all duration-300
                  ${isStudyMode ? 'cursor-pointer hover:shadow-lg active:scale-95' : 'hover:-translate-y-0.5'}
                  ${isStudyMode && !isRevealed ? 'border-dashed border-primary/30 bg-primary/5' : 'border-border'}
                  ${isDimmed ? 'opacity-40 grayscale pointer-events-none' : ''}
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
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getLevelBadgeColor(card.cefrLevel)}`}>
                        {card.cefrLevel || 'B1'}
                      </span>
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

                {/* Study Mode Challenge: English Context */}
                {isStudyMode && !isRevealed && card.englishSentence && (
                  <div className="mt-6 mb-8 px-4 py-3 bg-muted/30 rounded-lg border border-border/30 text-center animate-in fade-in duration-500">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      &quot;{card.englishSentence}&quot;
                    </p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-2 tracking-widest">
                      Translate to German
                    </p>
                  </div>
                )}

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
                        {stripLeadingArticle(card.germanTerm, card.article)}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => handleAudioControl(e, `${card.article !== 'none' ? card.article : ''} ${card.germanTerm}`, `${card.id}-term`)}
                      className={`p-1.5 rounded-full transition-all active:scale-95 ${
                        playingAudioKey === `${card.id}-term`
                          ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-110'
                      }`}
                      title={playingAudioKey === `${card.id}-term` ? 'Stop' : 'Listen'}
                    >
                      {playingAudioKey === `${card.id}-term` ? (
                        <Square className="w-4 h-4 fill-current" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground/60 text-xs w-10">Plural</span>
                      {card.article !== 'none' && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                          die
                        </span>
                      )}
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
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm italic text-foreground/80 leading-relaxed underline decoration-dotted decoration-primary/30 underline-offset-4 pointer-events-none">
                          &quot;{card.exampleSentence}&quot;
                        </p>
                        
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <button
                            onClick={(e) => handleAudioControl(e, card.exampleSentence, `${card.id}-sentence`)}
                            className={`transition-all p-1 ${
                              playingAudioKey === `${card.id}-sentence`
                                ? 'text-red-500 hover:text-red-600 scale-110'
                                : 'text-muted-foreground/50 hover:text-primary hover:scale-110'
                            }`}
                            title={playingAudioKey === `${card.id}-sentence` ? 'Stop' : 'Listen to sentence'}
                          >
                            {playingAudioKey === `${card.id}-sentence` ? (
                              <Square className="w-4 h-4 fill-current" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
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

                    {isStudyMode && (card.learningStep ?? 0) >= 1 && (
                      <button
                        onClick={(e) => handleSkipLoop(e, card.id)}
                        disabled={isUpdatingId === card.id}
                        className="w-full mb-2 py-2 bg-secondary/50 hover:bg-secondary text-xs font-bold uppercase rounded-lg transition-colors disabled:opacity-50"
                      >
                        Finish Loop Early (Keep Good (3d))
                      </button>
                    )}

                    {isStudyMode && (
                      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-border/50 animate-in slide-in-from-top-2">
                        <button
                          onClick={(e) => {
                            handleRating(e, card.id, 'very_hard')
                          }}
                          disabled={isUpdatingId === card.id}
                          className="px-1 py-3 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                          Again (Reset)
                        </button>
                        <button
                          onClick={(e) => {
                            handleRating(e, card.id, 'hard')
                          }}
                          disabled={isUpdatingId === card.id}
                          className="px-1 py-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Hard (1d)
                        </button>
                        <button
                          onClick={(e) => {
                            handleRating(e, card.id, 'medium')
                          }}
                          disabled={isUpdatingId === card.id}
                          className="px-1 py-3 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors disabled:opacity-50"
                        >
                          Good (3d)
                        </button>
                        <button
                          onClick={(e) => {
                            handleRating(e, card.id, 'easy')
                          }}
                          disabled={isUpdatingId === card.id}
                          className="px-1 py-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          Easy (7d)
                        </button>
                      </div>
                    )}
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

      {isStudyMode && currentCard && (
        <StudySessionModal
          activeCard={currentCard}
          isRevealed={revealedCardIds.has(currentCard.id)}
          onReveal={() => handleCardClick(currentCard.id)}
          onRate={(e, difficulty) => handleRating(e, currentCard.id, difficulty)}
          onExit={toggleStudyMode}
          playingAudioKey={playingAudioKey}
          onPlayAudio={handleAudioControl}
          totalDue={dueCards.length}
          isUpdatingId={isUpdatingId}
          onSkipLoop={(e) => handleSkipLoop(e, currentCard.id)}
          roundLabel={getRoundLabel(currentCard)}
        />
      )}

      {isStudyMode && !currentCard && (
        <SessionCompleteModal onExit={toggleStudyMode} />
      )}

      {editingId && editForm && (
        <EditVocabDialog
          form={editForm}
          setForm={setEditForm as any}
          onSave={(e) => saveEdit(e, editingId)}
          onCancel={cancelEditing}
          uniqueCategories={uniqueCategories}
        />
      )}
    </div>
  )
}

interface StudySessionModalProps {
  activeCard: VocabCard & { id: string }
  isRevealed: boolean
  onReveal: () => void
  onRate: (e: React.MouseEvent, difficulty: ReviewDifficulty) => void
  onExit: () => void
  playingAudioKey: string | null
  onPlayAudio: (e: React.MouseEvent, text: string, key: string) => void
  totalDue: number
  isUpdatingId: string | null
  onSkipLoop: (e: React.MouseEvent) => void
  roundLabel: string
}

function StudySessionModal({
  activeCard,
  isRevealed,
  onReveal,
  onRate,
  onExit,
  playingAudioKey,
  onPlayAudio,
  totalDue,
  isUpdatingId,
  onSkipLoop,
  roundLabel,
}: StudySessionModalProps) {
  const [isSentenceHovered, setIsSentenceHovered] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    setIsSentenceHovered(false)
  }, [activeCard.id])

  return (
    <div className="fixed inset-0 z-[100] bg-background/100 flex flex-col">
      <div className="p-4 border-b border-border/60">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Reviewing</span>
            <span className="px-2 py-0.5 rounded-full border border-border/60 text-[10px]">
              {totalDue} due
            </span>
          </div>
          <button
            onClick={onExit}
            className="p-2 rounded-full hover:bg-muted/70 transition-colors"
            title="Exit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="min-h-full flex items-center justify-center">
          <div
            onClick={onReveal}
            className={`
              w-full max-w-2xl group relative p-6 border rounded-2xl bg-card transition-all duration-300
              cursor-pointer hover:shadow-lg active:scale-[0.99]
              ${!isRevealed ? 'border-dashed border-primary/40 bg-primary/5' : 'border-border'}
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`
                font-bold uppercase tracking-wider transition-all duration-300
                ${!isRevealed ? 'text-lg text-primary mx-auto pt-6 pb-6 scale-110' : 'text-[10px] text-muted-foreground'}
              `}>
                {activeCard.originalTerm}
              </span>

              {isRevealed && (
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getLevelBadgeColor(activeCard.cefrLevel)}`}>
                    {activeCard.cefrLevel || 'B1'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center mb-4">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 border border-border/60 rounded-full px-2 py-0.5">
                {roundLabel}
              </span>
            </div>

            {!isRevealed && activeCard.englishSentence && (
              <div className="mt-6 mb-8 px-4 py-3 bg-muted/30 rounded-lg border border-border/30 text-center animate-in fade-in duration-500">
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &quot;{activeCard.englishSentence}&quot;
                </p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-2 tracking-widest">
                  Translate to German
                </p>
              </div>
            )}

            <div className={`transition-all duration-300 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {activeCard.article !== 'none' && (
                    <span className={`px-2.5 py-0.5 rounded-md text-sm font-bold border shadow-sm ${getArticleColor(activeCard.article)}`}>
                      {activeCard.article}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    {stripLeadingArticle(activeCard.germanTerm, activeCard.article)}
                  </h3>
                </div>
                <button
                  onClick={(e) =>
                    onPlayAudio(
                      e,
                      `${activeCard.article !== 'none' ? activeCard.article : ''} ${activeCard.germanTerm}`,
                      `${activeCard.id}-term`
                    )
                  }
                  className={`p-1.5 rounded-full transition-all active:scale-95 ${
                    playingAudioKey === `${activeCard.id}-term`
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-110'
                  }`}
                  title={playingAudioKey === `${activeCard.id}-term` ? 'Stop' : 'Listen'}
                >
                  {playingAudioKey === `${activeCard.id}-term` ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground/60 text-xs w-10">Plural</span>
                  {activeCard.article !== 'none' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                      die
                    </span>
                  )}
                  <span className="font-medium text-foreground">
                    {formatPlural(activeCard.plural)}
                  </span>
                </div>

                <div
                  className="relative bg-muted/50 p-4 rounded-lg border border-border/50"
                  onMouseEnter={() => setIsSentenceHovered(true)}
                  onMouseLeave={() => setIsSentenceHovered(false)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsSentenceHovered((prev) => !prev)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm italic text-foreground/80 leading-relaxed underline decoration-dotted decoration-primary/30 underline-offset-4 pointer-events-none min-h-[100px]">
                      &quot;{activeCard.exampleSentence}&quot;
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <button
                        onClick={(e) => onPlayAudio(e, activeCard.exampleSentence, `${activeCard.id}-sentence`)}
                        className={`transition-all p-1 ${
                          playingAudioKey === `${activeCard.id}-sentence`
                            ? 'text-red-500 hover:text-red-600 scale-110'
                            : 'text-muted-foreground/50 hover:text-primary hover:scale-110'
                        }`}
                        title={playingAudioKey === `${activeCard.id}-sentence` ? 'Stop' : 'Listen to sentence'}
                      >
                        {playingAudioKey === `${activeCard.id}-sentence` ? (
                          <Square className="w-4 h-4 fill-current" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isSentenceHovered && (
                    <div className="absolute left-0 -top-2 -translate-y-full w-full z-50 px-2 pb-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-popover text-popover-foreground text-xs p-3 rounded-md shadow-xl border border-border/50 backdrop-blur-md relative">
                        <div className="absolute bottom-0 left-6 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b border-border/50"></div>
                        {activeCard.englishSentence || 'No translation available for this card.'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground/60 border-t border-border/40">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1.5" />
                    {new Date(activeCard.createdAt.toDate()).toLocaleDateString()}
                  </div>
                  <span className="uppercase tracking-wider opacity-70 border border-border rounded px-1.5 py-0.5">
                    {activeCard.category}
                  </span>
                </div>

                {(activeCard.learningStep ?? 0) >= 1 && (
                  <button
                    onClick={onSkipLoop}
                    disabled={isUpdatingId === activeCard.id}
                    className="w-full py-2 bg-secondary/50 hover:bg-secondary text-xs font-bold uppercase rounded-lg transition-colors disabled:opacity-50"
                  >
                    Finish Loop Early (Keep Good (3d))
                  </button>
                )}
              </div>
            </div>

            {!isRevealed && (
              <div className="absolute inset-x-0 bottom-4 text-center">
                <span className="text-xs font-medium text-primary/60 animate-pulse">
                  Tap to reveal
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto">
          <button
            onClick={(e) => onRate(e, 'very_hard')}
            disabled={isUpdatingId === activeCard.id}
            className="px-1 py-3 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Again (Reset)
          </button>
          <button
            onClick={(e) => onRate(e, 'hard')}
            disabled={isUpdatingId === activeCard.id}
            className="px-1 py-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            Hard (1d)
          </button>
          <button
            onClick={(e) => onRate(e, 'medium')}
            disabled={isUpdatingId === activeCard.id}
            className="px-1 py-3 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors disabled:opacity-50"
          >
            Good (3d)
          </button>
          <button
            onClick={(e) => onRate(e, 'easy')}
            disabled={isUpdatingId === activeCard.id}
            className="px-1 py-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            Easy (7d)
          </button>
        </div>
      </div>
    </div>
  )
}

interface SessionCompleteModalProps {
  onExit: () => void
}

function SessionCompleteModal({ onExit }: SessionCompleteModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] bg-background/100 flex items-center justify-center p-6">
      <div className="text-center py-16 px-6 bg-green-50/50 dark:bg-green-950/20 rounded-2xl border border-green-100 dark:border-green-900/50 max-w-xl w-full">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">Session Complete!</h3>
        <p className="text-green-800 dark:text-green-300 max-w-md mx-auto">
          You&apos;ve reviewed all your due cards for now. Great job keeping your streak alive!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={() => {
              const inputElement = document.getElementById('english-term')
              if (inputElement) {
                inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                inputElement.focus()
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Generate New Term
          </button>

          <button
            onClick={onExit}
            className="px-6 py-2 bg-transparent hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium transition-colors border border-green-200 dark:border-green-800"
          >
            Back to Collection
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditVocabDialogProps {
  form: VocabCardInput
  setForm: (form: VocabCardInput) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
  uniqueCategories: string[]
}

function EditVocabDialog({
  form,
  setForm,
  onSave,
  onCancel,
  uniqueCategories,
}: EditVocabDialogProps) {
  const [isCustomCategory, setIsCustomCategory] = useState(
    !uniqueCategories.includes(form.category) && uniqueCategories.length > 0
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-card border border-border text-card-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-20">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Card
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">English Term</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.originalTerm}
                onChange={(e) => setForm({ ...form, originalTerm: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">German Term</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-background font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.germanTerm}
                onChange={(e) => setForm({ ...form, germanTerm: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Article</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.article}
                onChange={(e) => setForm({ ...form, article: e.target.value as any })}
              >
                <option value="der">der</option>
                <option value="die">die</option>
                <option value="das">das</option>
                <option value="none">none</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Plural</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.plural}
                onChange={(e) => setForm({ ...form, plural: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Level</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                value={form.cefrLevel}
                onChange={(e) => setForm({ ...form, cefrLevel: e.target.value as any })}
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
            {!isCustomCategory && uniqueCategories.length > 0 ? (
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                value={uniqueCategories.includes(form.category) ? form.category : uniqueCategories[0]}
                onChange={(e) => {
                  if (e.target.value === '__new_category__') {
                    setIsCustomCategory(true)
                    setForm({ ...form, category: '' })
                  } else {
                    setForm({ ...form, category: e.target.value })
                  }
                }}
              >
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__new_category__" className="font-bold text-primary">
                  + Add New Category
                </option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Type new category..."
                  autoFocus
                />
                {uniqueCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false)
                      setForm({ ...form, category: uniqueCategories[0] || '' })
                    }}
                    className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg bg-muted/50 hover:bg-muted"
                  >
                    Select Existing
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">German Sentence</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none min-h-[80px]"
                rows={3}
                value={form.exampleSentence}
                onChange={(e) => setForm({ ...form, exampleSentence: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">English Translation</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none min-h-[80px]"
                rows={3}
                value={form.englishSentence || ''}
                onChange={(e) => setForm({ ...form, englishSentence: e.target.value })}
                placeholder="Translation unavailable..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-card flex gap-3 sticky bottom-0 z-20">
          <button
            onClick={onSave}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-5 h-5" /> Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-secondary text-secondary-foreground font-bold py-3 rounded-xl hover:bg-secondary/80 flex items-center justify-center gap-2 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}