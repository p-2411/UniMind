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
import { GraduationCap, LayoutGrid, List, RefreshCcw, Search, Flame, Clock, Target } from 'lucide-react'
import { useCourseHealth } from '@/hooks/useCourseHealth'

type SortOption = 'recent' | 'alphabetical'
type ViewMode = 'grid' | 'list'

function formatDate(dateString: string) {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(parsed))
}

function daysSince(dateString: string) {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return null
  const ms = Date.now() - parsed
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  return days >= 0 ? days : null
}

function chip(cls: string, children: React.ReactNode) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
      'border-white/10 bg-white/5 text-gray-300',
      cls
    )}>
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

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
      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } })
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

  useEffect(() => { void fetchCourses() }, [fetchCourses])

  // ---------- filter/sort ----------
  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    let next = courses
    if (normalized) {
      next = next.filter(c => `${c.code} ${c.name} ${c.description ?? ''}`.toLowerCase().includes(normalized))
    }
    return [...next].sort((a, b) =>
      sortOption === 'alphabetical'
        ? a.name.localeCompare(b.name)
        : Date.parse(b.created_at) - Date.parse(a.created_at)
    )
  }, [courses, searchTerm, sortOption])

  // ---------- health ----------
  const courseIds = filteredCourses.map(c => String(c.id ?? c.code))
  const healthMap = useCourseHealth(courseIds)

  // ---------- computed stats ----------
  const totalSubjects = filteredCourses.length
  const avgMasteryPct = useMemo(() => {
    const vals = filteredCourses
      .map(c => healthMap[String(c.id ?? c.code)]?.overall_mastery)
      .filter((v): v is number => typeof v === 'number')
    if (!vals.length) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
  }, [filteredCourses, healthMap])

  const totalDue = useMemo(() => {
    return filteredCourses.reduce((sum, c) => sum + (healthMap[String(c.id ?? c.code)]?.due_count ?? 0), 0)
  }, [filteredCourses, healthMap])

  const soonestAssessment = useMemo(() => {
    const times = filteredCourses
      .map(c => healthMap[String(c.id ?? c.code)]?.upcoming_assessments?.[0]?.due_at)
      .filter(Boolean)
      .map(d => Date.parse(String(d)))
      .filter(n => !Number.isNaN(n))
    if (!times.length) return null
    const daysLeft = Math.ceil((Math.min(...times) - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 ? daysLeft : null
  }, [filteredCourses, healthMap])

  // Rank subjects for “today’s priority”: more due + lower mastery first
  const priorityList = useMemo(() => {
    return [...filteredCourses]
      .map(c => {
        const h = healthMap[String(c.id ?? c.code)]
        const mastery = typeof h?.overall_mastery === 'number' ? h!.overall_mastery : null
        const due = h?.due_count ?? 0
        const score = (due * 10) + (1 - (mastery ?? 0)) // simple: more due + lower mastery -> higher score
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

  const greetingName = user.display_name?.split(' ')[0] ?? 'there'

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#041a28] text-white">
        {/* ---------- Header ---------- */}
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden -ml-4" />
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                My Subjects
              </h1>
              <p className="text-gray-400 text-sm">Hi {greetingName}, here’s where to focus today.</p>
            </div>
          </div>
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
                <Target className="h-4 w-4 text-emerald-400" /> Avg mastery
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {avgMasteryPct !== null ? `${avgMasteryPct}%` : '—'}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400" /> Next assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {soonestAssessment !== null ? `${soonestAssessment}d` : '—'}
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
              <label className="flex items-center gap-2 text-sm text-gray-300">
                Sort by
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="recent" className="text-gray-900">Most recent</option>
                  <option value="alphabetical" className="text-gray-900">Alphabetical</option>
                </select>
              </label>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  className={cn('px-3', viewMode === 'grid' ? 'bg-orange-500 text-white hover:bg-orange-500' : 'text-gray-300 hover:text-white')}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  className={cn('px-3', viewMode === 'list' ? 'bg-orange-500 text-white hover:bg-orange-500' : 'text-gray-300 hover:text-white')}
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
          <h2 className="text-lg font-semibold mb-3">Today’s priority</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {priorityList.length === 0 ? (
              <p className="text-gray-400 text-sm">No items yet—add a subject or upload content.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {priorityList.map(({ course, h, mastery, due }, idx) => {
                  const masteryPct = mastery != null ? Math.round(mastery * 100) : null
                  const nextDue = (() => {
                    const dueAt = h?.upcoming_assessments?.[0]?.due_at
                    if (!dueAt) return null
                    const d = Math.ceil((Date.parse(dueAt) - Date.now()) / (1000*60*60*24))
                    return d >= 0 ? `${d}d` : null
                  })()
                  return (
                    <li key={course.id ?? course.code} className="py-3 flex items-center gap-4">
                      <div className="w-6 text-sm text-gray-400">{idx+1}.</div>
                      <div className="flex-1">
                        <div className="font-medium">{course.name}</div>
                        <div className="mt-2 h-1.5 w-full rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-1.5 rounded bg-gradient-to-r from-emerald-400 to-emerald-600"
                            style={{ width: `${Math.max(4, masteryPct ?? 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {chip('', <><Flame className="h-3.5 w-3.5 text-orange-400" />{due} due</>)}
                        {nextDue && chip('', <><Clock className="h-3.5 w-3.5 text-sky-400" />{nextDue}</>)}
                        <Button
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => { window.location.href = `/review?courseId=${course.id ?? course.code}` }}
                        >
                          Practice
                        </Button>
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
              {[1,2,3].map(i => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardHeader><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /></CardHeader>
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
              <p className="mt-2 text-sm text-gray-400">Adjust your search or enrol in a new subject.</p>
            </div>
          ) : (
            <div className={cn('grid gap-4', viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
              {filteredCourses.map((course) => {
                const h = healthMap[String(course.id ?? course.code)]
                const masteryPct = typeof h?.overall_mastery === 'number' ? Math.round(h!.overall_mastery * 100) : null
                const dueCount = h?.due_count ?? 0
                const nextDue = (() => {
                  const dueAt = h?.upcoming_assessments?.[0]?.due_at
                  if (!dueAt) return null
                  const d = Math.ceil((Date.parse(dueAt) - Date.now()) / (1000*60*60*24))
                  return d >= 0 ? `${d} day${d === 1 ? '' : 's'}` : null
                })()
                const enrolledDays = daysSince(course.created_at)

                return (
                  <Card
                    key={course.id ?? course.code}
                    className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-orange-400/60 hover:bg-white/10"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent" />
                    </div>
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <p className="mt-1 text-sm font-mono text-orange-300/90">{course.code}</p>
                        </div>
                        {enrolledDays !== null && chip('', <>{enrolledDays}d enrolled</>)}
                      </div>
                      <CardDescription className="text-sm text-gray-300">
                        {course.description ?? 'No description yet. Check back soon for curated resources.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm text-gray-300">
                      {/* Health chips */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {masteryPct !== null && chip('',
                          <><span className="h-2 w-2 rounded-full bg-emerald-400/80" /> Mastery: {masteryPct}%</>
                        )}
                        {chip('', <><Flame className="h-3.5 w-3.5 text-orange-400" /> {dueCount} due</>)}
                        {nextDue && chip('', <><Clock className="h-3.5 w-3.5 text-sky-400" /> Next: {nextDue}</>)}
                      </div>

                      {/* Mastery bar */}
                      {masteryPct !== null && (
                        <div className="mt-1">
                          <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
                            <div
                              className="h-2 rounded bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-500"
                              style={{ width: `${Math.max(4, masteryPct)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {chip('', <>Created {formatDate(course.created_at)}</>)}
                        {chip('', <>Status: Enrolled</>)}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="w-fit border-white/20 text-white hover:bg-white/15">
                          Overview
                        </Button>
                        <Button
                          className="w-fit bg-orange-500 text-white hover:bg-orange-600"
                          onClick={() => { window.location.href = `/review?courseId=${course.id ?? course.code}` }}
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
