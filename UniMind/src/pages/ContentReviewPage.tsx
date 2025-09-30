import '../App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
  result: {
    correct: boolean
    explanation: string
  } | null
}

const difficultyLabels: Record<ReviewQuestion['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function formatRelative(timestamp: number | null, prefix: string, emptyFallback: string) {
  if (!timestamp) return emptyFallback
  const diffMs = Date.now() - timestamp
  const absDiff = Math.abs(diffMs)
  const minutes = Math.round(absDiff / (60 * 1000))
  if (minutes < 1) return `${prefix}just now`
  if (minutes < 60) return `${prefix}${minutes} min${minutes === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${prefix}${hours} hr${hours === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const days = Math.round(hours / 24)
  return `${prefix}${days} day${days === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
}

function accuracyLabel(value: number) {
  const pct = Math.round(value * 100)
  return Number.isFinite(pct) ? `${pct}%` : '—'
}

function ContentReviewPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attemptStates, setAttemptStates] = useState<Record<string, AttemptState>>({})
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | ReviewQuestion['difficulty']>('all')

  const fetchQuestions = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/students/${user.id}/questions-for-extension`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { detail?: string }).detail ?? 'Failed to fetch review questions')
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const unexpected = await response.text()
        console.error('Unexpected response when fetching review questions:', unexpected)
        throw new Error('Unexpected response from server')
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
    } catch (err) {
      console.error('Error loading review questions:', err)
      setQuestions([])
      setError(err instanceof Error ? err.message : 'Failed to load review questions')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchQuestions()
  }, [fetchQuestions])

  const filteredQuestions = useMemo(() => {
    if (difficultyFilter === 'all') return questions
    return questions.filter((q) => q.difficulty === difficultyFilter)
  }, [questions, difficultyFilter])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const handleAttempt = async (question: ReviewQuestion, optionIndex: number) => {
    setAttemptStates((prev) => ({
      ...prev,
      [question.id]: {
        selectedIndex: optionIndex,
        submitting: true,
        error: null,
        result: prev[question.id]?.result ?? null,
      },
    }))

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Missing authentication token')
      }

      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/students/${user.id}/attempts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: question.id,
          answer_index: optionIndex,
          seconds: 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { detail?: string }).detail ?? 'Attempt failed')
      }

      const payload: { correct: boolean; explanation: string } = await response.json()

      setAttemptStates((prev) => ({
        ...prev,
        [question.id]: {
          selectedIndex: optionIndex,
          submitting: false,
          error: null,
          result: {
            correct: payload.correct,
            explanation: payload.explanation,
          },
        },
      }))
    } catch (err) {
      console.error('Error submitting attempt:', err)
      setAttemptStates((prev) => ({
        ...prev,
        [question.id]: {
          selectedIndex: optionIndex,
          submitting: false,
          result: prev[question.id]?.result ?? null,
          error: err instanceof Error ? err.message : 'Attempt failed',
        },
      }))
    }
  }

  const renderOption = (question: ReviewQuestion, option: string, idx: number) => {
    const state = attemptStates[question.id]
    const isSubmitting = state?.submitting ?? false
    const isSelected = state?.selectedIndex === idx
    const hasAnswered = !!state?.result
    const isCorrectOption = hasAnswered && idx === question.correctAnswer
    const isIncorrectSelection = hasAnswered && isSelected && idx !== question.correctAnswer

    return (
      <button
        key={idx}
        type="button"
        disabled={isSubmitting || hasAnswered}
        onClick={() => handleAttempt(question, idx)}
        className={cn(
          'w-full text-left border border-white/10 bg-white/5 rounded-lg px-4 py-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
          isSelected && !hasAnswered && 'border-orange-400 bg-orange-400/10',
          hasAnswered && isCorrectOption && 'border-green-400 bg-green-500/10 text-green-200',
          hasAnswered && isIncorrectSelection && 'border-red-400 bg-red-500/10 text-red-200',
          isSubmitting && 'opacity-70'
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
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  void fetchQuestions()
                }}
              >
                Refresh list
              </Button>
            </div>
          </div>

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

          {!loading && !error && filteredQuestions.length > 0 && (
            <div className="grid gap-4">
              {filteredQuestions.map((question) => {
                const state = attemptStates[question.id]
                return (
                  <Card key={question.id} className="bg-white/5 border-white/10">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                          {question.topic}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Difficulty: {difficultyLabels[question.difficulty]}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Accuracy: {accuracyLabel(question.rollingAccuracy)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          Attempts: {question.attempts}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                          {formatRelative(question.lastSeenAt, 'Seen ', 'Not attempted yet')}
                        </span>
                        {question.nextDueAt && (
                          <span className="inline-flex items-center rounded-full border border-orange-400/50 bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-200">
                            {formatRelative(question.nextDueAt, 'Due ', 'Due soon')}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg text-white leading-snug">
                        {question.prompt}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-400">
                        Choose the best answer to reinforce this concept.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {question.options.map((option, idx) => renderOption(question, option, idx))}

                      {state?.error && (
                        <p className="text-sm text-red-400">{state.error}</p>
                      )}

                      {state?.result && (
                        <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                          <p className="font-semibold text-white">
                            {state.result.correct ? 'Nice work! That’s correct.' : 'Not quite. Review the explanation below.'}
                          </p>
                          {state.result.explanation && (
                            <p className="mt-2 text-gray-300">{state.result.explanation}</p>
                          )}
                          {!state.result.correct && question.options[question.correctAnswer] && (
                            <p className="mt-2 text-gray-200">
                              Correct answer: <span className="font-semibold">{question.options[question.correctAnswer]}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ContentReviewPage
