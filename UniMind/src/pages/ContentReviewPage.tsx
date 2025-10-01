// src/pages/ContentReviewPage.tsx
import '../App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { chooseNextQuestions, updateAfterAnswer } from '@/lib/question-selector'
import { ChevronDown, Check, Filter } from 'lucide-react'


type ReviewQuestion = {
  id: string
  topic: string
  prompt: string
  options: string[]
  correctAnswer: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string | null
  lastSeenAt: number | null
  nextDueAt: number | null
  rollingAccuracy: number
  attempts: number
}

type AttemptState = {
  selectedIndex: number | null
  submitting: boolean
  error: string | null
  result: { correct: boolean; explanation: string } | null
}

const difficultyLabels: Record<ReviewQuestion['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function formatRelative(ts: number | null, prefix: string, empty: string) {
  if (!ts) return empty
  const diffMs = Date.now() - ts
  const mins = Math.round(Math.abs(diffMs) / 60000)
  if (mins < 1) return `${prefix}just now`
  if (mins < 60) return `${prefix}${mins} min${mins === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${prefix}${hrs} hr${hrs === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const days = Math.round(hrs / 24)
  return `${prefix}${days} day${days === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
}

function accuracyLabel(v: number) {
  const pct = Math.round(v * 100)
  return Number.isFinite(pct) ? `${pct}%` : '—'
}

function ContentReviewPage() {
  const { user } = useAuth()

  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [attemptStates, setAttemptStates] = useState<Record<string, AttemptState>>({})
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | ReviewQuestion['difficulty']>('all')

  const [pageQuestions, setPageQuestions] = useState<ReviewQuestion[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // NEW: topic/class filter state
  const [topicsOpen, setTopicsOpen] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())

  const fetchQuestions = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('No authentication token found')

      const baseUrl =
        (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

      const response = await fetch(`${baseUrl}/students/${user.id}/review-questions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { detail?: string }).detail ?? 'Failed to fetch review questions')
      }

      const raw: any[] = await response.json()
      const mapped: ReviewQuestion[] = raw.map((item) => ({
        id: item.id,
        topic: item.topic,
        prompt: item.prompt,
        options: Array.isArray(item.options) ? item.options : [],
        correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : 0,
        difficulty: (item.difficulty as ReviewQuestion['difficulty']) ?? 'medium',
        explanation: item.explanation ?? null,
        lastSeenAt: typeof item.last_seen_at === 'number' ? item.last_seen_at : null,
        nextDueAt: typeof item.next_due_at === 'number' ? item.next_due_at : null,
        rollingAccuracy: typeof item.rolling_accuracy === 'number' ? item.rolling_accuracy : 0.5,
        attempts: typeof item.attempts === 'number' ? item.attempts : 0,
      }))

      setQuestions(mapped)
      setAttemptStates({})
      setSeenIds(new Set())
    } catch (err) {
      console.error(err)
      setQuestions([])
      setError(err instanceof Error ? err.message : 'Failed to load review questions')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchQuestions()
  }, [fetchQuestions])

  // Derive unique topic list from fetched questions
  const allTopics = useMemo(() => {
    const s = new Set<string>()
    for (const q of questions) s.add(q.topic)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [questions])

  // Topic helpers
  const toggleTopic = (t: string) =>
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  const clearTopics = () => setSelectedTopics(new Set())
  const selectAllTopics = () => setSelectedTopics(new Set(allTopics))

  // Apply filters (difficulty + topics)
  const filteredQuestions = useMemo(() => {
    const byDiff = difficultyFilter === 'all' ? questions : questions.filter((q) => q.difficulty === difficultyFilter)
    if (selectedTopics.size === 0) return byDiff
    return byDiff.filter((q) => selectedTopics.has(q.topic))
  }, [questions, difficultyFilter, selectedTopics])

  const hasNext = useMemo(
    () => filteredQuestions.some((q) => !seenIds.has(q.id)),
    [filteredQuestions, seenIds]
  )

  // First page whenever filters change
  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setPageQuestions([])
      setSeenIds(new Set())
      return
    }
    const first = chooseNextQuestions(filteredQuestions, 3)
    setPageQuestions(first)
    setSeenIds(new Set(first.map((q) => q.id)))
  }, [filteredQuestions])

  const handleNextPage = () => {
    const next = chooseNextQuestions(filteredQuestions, 3, seenIds)
    if (next.length === 0) return
    const newSeen = new Set(seenIds)
    next.forEach((q) => newSeen.add(q.id))
    setSeenIds(newSeen)
    setPageQuestions(next)
    setAttemptStates((prev) => {
      const copy = { ...prev }
      for (const q of next) delete copy[q.id]
      return copy
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const handleAttempt = async (question: ReviewQuestion, optionIndex: number) => {
    setAttemptStates((p) => ({
      ...p,
      [question.id]: { selectedIndex: optionIndex, submitting: true, error: null, result: p[question.id]?.result ?? null },
    }))

    try {
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('Missing authentication token')
      const baseUrl =
        (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

      const res = await fetch(`${baseUrl}/students/${user.id}/attempts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, answer_index: optionIndex, seconds: 0 }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { detail?: string }).detail ?? 'Attempt failed')
      }
      const payload: { correct: boolean; explanation: string } = await res.json()

      setAttemptStates((p) => ({
        ...p,
        [question.id]: { selectedIndex: optionIndex, submitting: false, error: null, result: payload },
      }))
      setPageQuestions((prev) => prev.map((q) => (q.id === question.id ? updateAfterAnswer(q, payload.correct) : q)))
    } catch (err) {
      setAttemptStates((p) => ({
        ...p,
        [question.id]: {
          selectedIndex: optionIndex,
          submitting: false,
          result: p[question.id]?.result ?? null,
          error: err instanceof Error ? err.message : 'Attempt failed',
        },
      }))
    }
  }

  const renderOption = (q: ReviewQuestion, option: string, idx: number) => {
    const st = attemptStates[q.id]
    const submitting = st?.submitting ?? false
    const selected = st?.selectedIndex === idx
    const answered = !!st?.result
    const correct = answered && idx === q.correctAnswer
    const wrongSel = answered && selected && idx !== q.correctAnswer

    return (
      <button
        key={idx}
        type="button"
        disabled={submitting || answered}
        onClick={() => handleAttempt(q, idx)}
        className={cn(
          'w-full text-left border border-white/10 bg-white/5 rounded-lg px-4 py-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
          selected && !answered && 'border-orange-400 bg-orange-400/10',
          answered && correct && 'border-green-400 bg-green-500/10 text-green-200',
          answered && wrongSel && 'border-red-400 bg-red-500/10 text-red-200',
          submitting && 'opacity-70'
        )}
      >
        <div className="flex gap-3 items-start">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {String.fromCharCode(65 + idx)}
          </span>
          <span className="text-sm leading-relaxed text-gray-200">{option}</span>
        </div>
      </button>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#052334]">
        <header className="flex h-12 items-center gap-2 border-b-1 p-8">
          <SidebarTrigger className="md:hidden -ml-8 mr-2" />
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">
            Content Review
          </h1>
        </header>

        <div className="p-4 space-y-6">
          {/* Top controls */}
          {/* Top row: title + difficulties + refresh */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Ready to practise?</h2>
              <p className="text-sm text-gray-400">Answer questions from your enrolled topics and keep your mastery sharp.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'easy', 'medium', 'hard'] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={difficultyFilter === filter ? 'default' : 'outline'}
                  onClick={() => setDifficultyFilter(filter)}
                  className="capitalize"
                >
                  {filter === 'all' ? 'All difficulties' : difficultyLabels[filter]}
                </Button>
              ))}

              <Button type="button" variant="outline" disabled={loading} onClick={() => void fetchQuestions()}>
                Refresh list
              </Button>
            </div>
          </div>

          {/* Second row: Topics filter on its own line */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTopicsOpen((v) => !v)}
                className="inline-flex items-center gap-2"
              >
                <Filter className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                Topics
                {selectedTopics.size > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    {selectedTopics.size}
                  </span>
                )}
                <ChevronDown className={cn('h-4 w-4 transition-transform', topicsOpen && 'rotate-180')} />
              </Button>

              {topicsOpen && (
                <div
                  className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-xl p-2"
                  onMouseLeave={() => setTopicsOpen(false)}
                >
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs uppercase tracking-wide text-gray-400">Filter by topics</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllTopics} className="text-xs text-gray-300 hover:text-white">
                        Select all
                      </button>
                      <button type="button" onClick={clearTopics} className="text-xs text-gray-300 hover:text-white">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto pr-1">
                    {allTopics.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-gray-400">No topics available</div>
                    ) : (
                      allTopics.map((topic) => {
                        const checked = selectedTopics.has(topic)
                        return (
                          <label
                            key={topic}
                            className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white/5"
                            onMouseDown={(e) => e.preventDefault()} // keep dropdown open
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTopic(topic)}
                              className="peer sr-only"
                            />
                            <span
                              className={cn(
                                'grid place-items-center h-4 w-4 rounded border',
                                checked ? 'border-orange-400 bg-orange-400/20' : 'border-white/20 bg-transparent'
                              )}
                            >
                              {checked && <Check className="h-3 w-3 text-orange-300" />}
                            </span>
                            <span className="text-sm text-gray-200 truncate">{topic}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Loading skeletons */}
          {loading && (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full mt-3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3, 4].map((opt) => (
                      <Skeleton key={opt} className="h-10 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Errors / Empty */}
          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-red-400 text-lg">{error}</p>
              <p className="text-gray-500 text-sm mt-2">Try refreshing the page or signing in again.</p>
            </div>
          )}

          {!loading && !error && filteredQuestions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No questions to review right now.</p>
              <p className="text-gray-500 text-sm mt-2">Complete lessons or enrol in subjects to unlock more practice.</p>
            </div>
          )}

          {/* Questions */}
          {!loading && !error && filteredQuestions.length > 0 && (
            <div className="grid gap-4">
              {pageQuestions.map((q) => {
                const st = attemptStates[q.id]
                return (
                  <Card key={q.id} className="bg-white/5 border-white/10">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                          {q.topic}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Difficulty: {difficultyLabels[q.difficulty]}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Accuracy: {accuracyLabel(q.rollingAccuracy)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Attempts: {q.attempts}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          {formatRelative(q.lastSeenAt, 'Seen ', 'Not attempted yet')}
                        </span>
                        {q.nextDueAt && (
                          <span className="inline-flex items-center rounded-full border border-orange-400/50 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-200">
                            {formatRelative(q.nextDueAt, 'Due ', 'Due soon')}
                          </span>
                        )}
                      </div>

                      <CardTitle className="text-lg text-white leading-snug">{q.prompt}</CardTitle>
                      <CardDescription className="text-sm text-gray-400">
                        Choose the best answer to reinforce this concept.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {q.options.map((opt, i) => renderOption(q, opt, i))}

                      {st?.error && <p className="text-sm text-red-400">{st.error}</p>}

                      {st?.result && (
                        <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                          <p className="font-semibold text-white">
                            {st.result.correct ? 'Nice work! That’s correct.' : 'Not quite. Review the explanation below.'}
                          </p>
                          {st.result.explanation && <p className="mt-2 text-gray-300">{st.result.explanation}</p>}
                          {!st.result.correct && q.options[q.correctAnswer] && (
                            <p className="mt-2 text-gray-200">
                              Correct answer: <span className="font-semibold">{q.options[q.correctAnswer]}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              <div className="flex justify-end mt-2">
                <Button type="button" variant="default" onClick={handleNextPage} disabled={!hasNext}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ContentReviewPage
