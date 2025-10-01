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
import { GraduationCap, LayoutGrid, List, RefreshCcw, Search } from 'lucide-react'

type SortOption = 'recent' | 'alphabetical'
type ViewMode = 'grid' | 'list'

function formatDate(dateString: string) {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed))
}

function daysSince(dateString: string) {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return null
  const ms = Date.now() - parsed
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  return days >= 0 ? days : null
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
      if (!token) {
        throw new Error('No authentication token found')
      }

      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { detail?: string }).detail || 'Failed to fetch courses')
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const unexpected = await response.text()
        console.error('Unexpected response when fetching courses:', unexpected)
        throw new Error('Unexpected response from server')
      }

      const data: Course[] = await response.json()
      setCourses(data)
    } catch (err) {
      console.error('Error fetching courses:', err)
      setCourses([])
      setError(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchCourses()
  }, [fetchCourses])

  const totalSubjects = courses.length

  const recentlyAdded = useMemo(() => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
    const now = Date.now()
    return courses.filter((course) => {
      const created = Date.parse(course.created_at)
      if (Number.isNaN(created)) return false
      return now - created <= THIRTY_DAYS_MS
    }).length
  }, [courses])

  const newestCourse = useMemo(() => {
    if (!courses.length) return null
    return courses.reduce<Course | null>((latest, current) => {
      if (!latest) return current
      const latestTime = Date.parse(latest.created_at)
      const currentTime = Date.parse(current.created_at)
      if (Number.isNaN(currentTime)) return latest
      if (Number.isNaN(latestTime)) return current
      return currentTime > latestTime ? current : latest
    }, null)
  }, [courses])

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    let next = courses

    if (normalizedSearch) {
      next = next.filter((course) => {
        const haystack = `${course.code} ${course.name} ${course.description ?? ''}`.toLowerCase()
        return haystack.includes(normalizedSearch)
      })
    }

    const sorted = [...next]
    sorted.sort((a, b) => {
      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name)
      }

      const aTime = Date.parse(a.created_at)
      const bTime = Date.parse(b.created_at)
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
      if (Number.isNaN(aTime)) return 1
      if (Number.isNaN(bTime)) return -1
      return bTime - aTime
    })

    return sorted
  }, [courses, searchTerm, sortOption])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const greetingName = user.display_name?.split(' ')[0] ?? 'there'

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#041a28]">
        <header className="flex flex-col gap-2 border-b-1 p-8 pb-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden -ml-4" />
            <div>
              <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">
                My Subjects
              </h1>
              <p className="text-sm text-gray-400">Track the courses you're enrolled in and jump back into learning.</p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-300">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-wide text-orange-200/70">Welcome back, {greetingName}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Keep momentum with your enrolled subjects</h2>
                  <p className="mt-2 text-sm text-gray-300 max-w-xl">
                    Explore subject resources, check what's new, and revisit topics that need your attention. Filter and sort to find exactly what you need.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  disabled={loading}
                  onClick={() => {
                    void fetchCourses()
                  }}
                >
                  <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total subjects</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalSubjects}</p>
                <p className="mt-2 text-sm text-gray-400">Your current enrolment count.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Added this month</p>
                <p className="mt-3 text-3xl font-semibold text-white">{recentlyAdded}</p>
                <p className="mt-2 text-sm text-gray-400">New subjects joined in the last 30 days.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Most recent</p>
                <p className="mt-2 text-lg font-semibold text-white">{newestCourse?.name ?? '—'}</p>
                <p className="mt-1 text-sm text-gray-400">{newestCourse ? `Joined ${formatDate(newestCourse.created_at)}` : 'Enroll to see updates here.'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by subject name or code"
                  className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  Sort by
                  <select
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value as SortOption)}
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
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((index) => (
                    <Card key={index} className="bg-white/5 border-white/10">
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-5/6" />
                        <Skeleton className="h-5 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
                  <p className="text-lg font-medium text-red-200">{error}</p>
                  <p className="text-sm text-red-100/80">Try refreshing or check your connection, then sign in again if needed.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-400/60 text-red-100 hover:bg-red-400/20"
                    onClick={() => {
                      void fetchCourses()
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />Retry
                  </Button>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                  <div className="rounded-full border border-white/10 bg-white/10 p-4 text-orange-300">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">No subjects found</p>
                    <p className="mt-2 text-sm text-gray-400">Adjust your search or enrol in a new subject to see it appear here.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      setSearchTerm('')
                      void fetchCourses()
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCourses.map((course) => {
                    const days = daysSince(course.created_at)
                    return (
                      <Card
                        key={course.code}
                        className="group relative overflow-hidden border-white/10 bg-white/5 transition-all hover:border-orange-400/60 hover:bg-white/10"
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent" />
                        </div>
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-lg text-white">{course.name}</CardTitle>
                              <p className="mt-1 text-sm font-mono text-orange-300/90">{course.code}</p>
                            </div>
                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-gray-300">
                              {days != null ? `${days} day${days === 1 ? '' : 's'} enrolled` : 'Active enrolment'}
                            </span>
                          </div>
                          <CardDescription className="text-sm text-gray-300">
                            {course.description ? course.description : 'No description yet. Check back soon for curated resources.'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm text-gray-300">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                              Created {formatDate(course.created_at)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                              Status: Enrolled
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-fit border-white/20 text-white hover:bg-white/15"
                          >
                            View subject overview
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCourses.map((course) => (
                    <div
                      key={course.code}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-orange-300/50 hover:bg-white/10 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-orange-300/90">{course.code}</span>
                        <h3 className="text-lg font-semibold text-white">{course.name}</h3>
                        <p className="text-sm text-gray-300">
                          {course.description ? course.description : "No description available yet. We're compiling resources for you."}
                        </p>
                        <p className="text-xs text-gray-400">Joined {formatDate(course.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">Active</span>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/15"
                        >
                          Open subject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default MySubjectsPage
