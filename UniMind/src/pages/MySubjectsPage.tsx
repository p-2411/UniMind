// src/pages/MySubjectsPage.tsx
import '../App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Course } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { GraduationCap, LayoutGrid, List, RefreshCcw, Search, Flame, Clock, CheckCircle, ChevronDown } from 'lucide-react'
import { useCourseHealth } from '@/hooks/useCourseHealth'
import { Link } from 'react-router-dom'

type SortOption = 'recent' | 'alphabetical'
type ViewMode = 'grid' | 'list'

type NextAssessmentInfo = {
  id: string
  course_code: string
  title: string
  due_at: string | null
  dueTime: number
}

function formatDate(dateString: string) {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(parsed))
}

function chip(cls: string, children: React.ReactNode) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
        'border-white/10 bg-white/5 text-gray-300',
        cls
      )}
    >
      {children}
    </span>
  )
}

function MySubjectsPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [sortOpen, setSortOpen] = useState(false) // NEW: dropdown open state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [upcomingAssessments, setUpcomingAssessments] = useState<NextAssessmentInfo[]>([])
  const [completedToday, setCompletedToday] = useState<number | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!user) {
      setCourses([])
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

      const response = await fetch(`${baseUrl}/students/${user.id}/enrolments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { detail?: string }).detail || 'Failed to fetch courses')
      }
      const data: Course[] = await response.json()
      setCourses(data)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    let cancelled = false

    const fetchUpcomingAssessments = async () => {
      if (!user?.id) {
        setUpcomingAssessments([])
        return
      }

      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setUpcomingAssessments([])
          return
        }

        const baseUrl =
          (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
        const response = await fetch(`${baseUrl}/students/${user.id}/upcoming-assessments?limit=10`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.error('Failed to fetch upcoming assessments for subjects page:', response.status)
          setUpcomingAssessments([])
          return
        }

        const data: Array<{ id: string; course_code: string; title: string; due_at: string | null }> =
          await response.json()
        const now = Date.now()
        const processed = data
          .map((item) => ({
            ...item,
            dueTime: item.due_at ? Date.parse(item.due_at) : Number.NaN,
          }))
          .filter((item) => Number.isFinite(item.dueTime) && item.dueTime >= now)
          .sort((a, b) => a.dueTime - b.dueTime)

        if (!cancelled) {
          setUpcomingAssessments(processed)
        }
      } catch (error) {
        console.error('Error fetching upcoming assessments for subjects page:', error)
        if (!cancelled) {
          setUpcomingAssessments([])
        }
      }
    }

    void fetchUpcomingAssessments()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false

    const fetchTodayStats = async () => {
      if (!user?.id) {
        setCompletedToday(null)
        return
      }

      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setCompletedToday(null)
          return
        }

        const baseUrl =
          (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
        const response = await fetch(`${baseUrl}/students/${user.id}/today-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.error('Failed to fetch today stats:', response.status)
          if (!cancelled) setCompletedToday(null)
          return
        }

        const data: { completed_questions_today?: number } = await response.json()
        if (!cancelled) {
          setCompletedToday(typeof data.completed_questions_today === 'number' ? data.completed_questions_today : 0)
        }
      } catch (err) {
        console.error('Error fetching today stats:', err)
        if (!cancelled) setCompletedToday(null)
      }
    }

    void fetchTodayStats()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // ---------- filter/sort ----------
  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    let next = courses
    if (normalized) {
      next = next.filter((c) => `${c.code} ${c.name} ${c.description ?? ''}`.toLowerCase().includes(normalized))
    }
    return [...next].sort((a, b) =>
      sortOption === 'alphabetical' ? a.name.localeCompare(b.name) : Date.parse(b.created_at) - Date.parse(a.created_at)
    )
  }, [courses, searchTerm, sortOption])

  // ---------- health ----------
  const courseIds = filteredCourses.map((c) => c.code)
  const healthMap = useCourseHealth(courseIds)

  // ---------- computed stats ----------
  const totalSubjects = filteredCourses.length
  const totalDue = useMemo(() => {
    return filteredCourses.reduce((sum, c) => sum + (healthMap[c.code]?.due_count ?? 0), 0)
  }, [filteredCourses, healthMap])

  const nextAssessment = upcomingAssessments.length > 0 ? upcomingAssessments[0] : null

  const daysUntilNextAssessment = useMemo(() => {
    if (!nextAssessment) return null
    const diff = Math.ceil((nextAssessment.dueTime - Date.now()) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff : 0
  }, [nextAssessment])

  const nextAssessmentCourse = useMemo(() => {
    if (!nextAssessment) return null
    return filteredCourses.find((course) => course.code === nextAssessment.course_code) ?? null
  }, [filteredCourses, nextAssessment])

  // Rank subjects for "today's priority": more due + lower mastery first
  const priorityList = useMemo(() => {
    return [...filteredCourses]
      .map((c) => {
        const h = healthMap[c.code]
        const mastery = typeof h?.overall_mastery === 'number' ? (h!.overall_mastery as number) : null
        const due = h?.due_count ?? 0
        const score = due * 10 + (1 - (mastery ?? 0)) // simple: more due + lower mastery -> higher score
        return { course: c, h, mastery, due, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [filteredCourses, healthMap])

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <p>Loading…</p>
      </div>
    )
  }

  const sortLabel = sortOption === 'recent' ? 'Most recent' : 'Alphabetical'

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#041a28] text-white">
        {/* ---------- Header ---------- */}
        <header className="flex h-12 items-center gap-2 border-b-1 p-8 mb-6">
          <SidebarTrigger className="md:hidden -ml-8 mr-2" />
          <h1 className="text-3xl font-semibold bg-gradient-to-r bg-yellow-400 inline-block text-transparent bg-clip-text">
            My Subjects
          </h1>
        </header>

        {/* ---------- Overview metrics ---------- */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Total subjects</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{totalSubjects}</CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 inline-flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" /> Items due
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{totalDue}</CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 inline-flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> Completed today
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {completedToday !== null ? completedToday : '—'}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-400 inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-400" />
                  Next assessment
                </CardTitle>

                {nextAssessment?.due_at ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                    Due&nbsp;{formatDate(nextAssessment.due_at)}
                  </span>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="pt-1">
              {nextAssessment ? (
                <div className="flex items-center justify-between gap-4">
                  {/* Left: details */}
                  <div className="min-w-0 space-y-1.5">
                    {/* Title */}
                    <h3 className="truncate text-lg font-medium text-white/90">{nextAssessment.title}</h3>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Course code */}
                      <span className="font-mono rounded border border-orange-400/20 bg-orange-400/10 px-1.5 py-0.5 text-orange-300/90">
                        {nextAssessment.course_code}
                      </span>

                      {/* Divider dot (only if name shown) */}
                      {nextAssessmentCourse?.name ? <span className="text-gray-500">·</span> : null}
                    </div>
                  </div>

                  {/* Right: days remaining */}
                  <div className="text-right shrink-0">
                    <div className="leading-none">
                      <span className="text-3xl font-semibold tabular-nums">
                        {daysUntilNextAssessment !== null ? `${daysUntilNextAssessment}d` : '—'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">Remaining</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">No upcoming assessments.</p>
                  <div className="text-right">
                    <span className="text-3xl font-semibold">—</span>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">Remaining</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ---------- Search / view controls ---------- */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by subject name or code"
                className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {/* NEW: custom single-select dropdown with highlighted button */}
              <div className="flex items-center gap-2 text-sm text-gray-300">
                Sort by:
                <div className="relative inline-flex">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSortOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                    className={cn(
                      'inline-flex items-center gap-2',
                      // base
                      'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10',
                      // highlight the button itself when not default
                      sortOption !== 'recent' && 'border-orange-400/40 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15'
                    )}
                  >
                    {sortLabel}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', sortOpen && 'rotate-180')} />
                  </Button>

                  {sortOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-white/10 bg-slate-900/95 p-1 shadow-xl backdrop-blur-md"
                      onMouseLeave={() => setSortOpen(false)}
                    >
                      {(
                        [
                          { value: 'recent', label: 'Most recent' },
                          { value: 'alphabetical', label: 'Alphabetical' },
                        ] as const
                      ).map((opt) => {
                        const active = sortOption === opt.value
                        return (
                          <button
                            key={opt.value}
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setSortOption(opt.value)
                              setSortOpen(false)
                            }}
                            className={cn(
                              'flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition',
                              'hover:bg-white/5 text-gray-200',
                              active && 'bg-yellow-400/10 text-yellow-100'
                            )}
                          >
                            <span className="truncate">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-pressed={viewMode === 'grid'}
                  className={cn(
                    'h-9 w-9 rounded-full transition-colors',
                    viewMode === 'grid'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'text-gray-300 hover:text-white hover:bg-white/15'
                  )}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-pressed={viewMode === 'list'}
                  className={cn(
                    'h-9 w-9 rounded-full transition-colors',
                    viewMode === 'list'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'text-gray-300 hover:text-white hover:bg-white/15'
                  )}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                disabled={loading}
                onClick={() => void fetchCourses()}
              >
                <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {/* ---------- Today’s priority ---------- */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Today’s priority</h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {priorityList.length === 0 ? (
              <p className="text-gray-400 text-sm">No items yet—add a subject or upload content.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {priorityList.map(({ course, h, due }, idx) => {
                  const dueCount = h?.due_count ?? 0
                  const completedCount = h?.completed_due_count ?? 0
                  const progressPct = dueCount > 0 ? Math.round((completedCount / dueCount) * 100) : 0
                  const nextDue = (() => {
                    const dueAt = h?.upcoming_assessments?.[0]?.due_at
                    if (!dueAt) return null
                    const d = Math.ceil((Date.parse(dueAt) - Date.now()) / (1000 * 60 * 60 * 24))
                    return d >= 0 ? `${d}d` : null
                  })()

                  return (
                    <li key={course.code} className="py-3 flex items-center gap-4">
                      <div className="w-6 text-sm text-gray-400">{idx + 1}.</div>
                      <div className="flex-1">
                        <div className="font-medium">{course.name}</div>
                        <div className="mt-2 h-1.5 w-full rounded bg-white/10 overflow-hidden">
                          <div
                            className={cn(
                              'h-1.5 rounded transition-[width] duration-500',
                              dueCount === 0 ? 'bg-white/20' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                            )}
                            style={{ width: `${dueCount === 0 ? 100 : Math.max(4, progressPct)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {completedCount}/{dueCount} due completed today
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {chip(
                          '',
                          <>
                            <Flame className="h-3.5 w-3.5 text-orange-400" />
                            {due} due
                          </>
                        )}
                        {nextDue &&
                          chip(
                            '',
                            <>
                              <Clock className="h-3.5 w-3.5 text-sky-400" />
                              {nextDue}
                            </>
                          )}

                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ---------- Subjects ---------- */}
        <section>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
              <p className="text-lg font-medium text-red-200">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 border-red-400/60 text-red-100 hover:bg-red-400/20"
                onClick={() => void fetchCourses()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="rounded-full border border-white/10 bg-white/10 p-4 text-orange-300 inline-block mb-3">
                <GraduationCap className="h-8 w-8" />
              </div>
              <p className="text-xl font-semibold">No subjects found</p>
              <p className="mt-2 text-sm text-gray-400">
                Adjust your search or{' '}
                <Link to="/settings" className="text-yellow-400 hover:text-yellow-300 underline underline-offset-2">
                  enrol in a new subject
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className={cn('grid gap-4', viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
              {filteredCourses.map((course) => {
                const h = healthMap[course.code]
                const masteryPct = typeof h?.overall_mastery === 'number' ? Math.round(h!.overall_mastery * 100) : null
                const dueCount = h?.due_count ?? 0
                const nextDue = (() => {
                  const dueAt = h?.upcoming_assessments?.[0]?.due_at
                  if (!dueAt) return null
                  const d = Math.ceil((Date.parse(dueAt) - Date.now()) / (1000 * 60 * 60 * 24))
                  return d >= 0 ? `${d} day${d === 1 ? '' : 's'}` : null
                })()

                return (
                  <Card
                    key={course.code}
                    className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-yellow-400/60 hover:bg-white/10"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent" />
                    </div>
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <p className="mt-1 text-sm font-mono text-yellow-300/90">{course.code}</p>
                        </div>
                      </div>
                      <CardDescription className="text-sm text-gray-300">
                        {course.description ?? 'No description yet. Check back soon for curated resources.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm text-gray-300">
                      {/* Health chips */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {masteryPct !== null &&
                          chip(
                            '',
                            <>
                              <span className="h-2 w-2 rounded-full bg-emerald-400/80" /> Mastery: {masteryPct}%
                            </>
                          )}
                        {chip(
                          '',
                          <>
                            <Flame className="h-3.5 w-3.5 text-orange-400" /> {dueCount} due
                          </>
                        )}
                        {nextDue &&
                          chip(
                            '',
                            <>
                              <Clock className="h-3.5 w-3.5 text-sky-400" /> Next: {nextDue}
                            </>
                          )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {chip('', <>Created {formatDate(course.created_at)}</>)}
                        {chip('', <>Status: Enrolled</>)}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          className="w-fit bg-yellow-400 text-black hover:bg-yellow-300"
                          onClick={() => {
                            window.location.href = `/review?courseId=${course.code}`
                          }}
                        >
                          Practice {dueCount ? `(${dueCount})` : ''}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default MySubjectsPage
