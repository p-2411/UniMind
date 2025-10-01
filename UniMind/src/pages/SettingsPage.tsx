import '../App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Course } from '@/types/database'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  const { user, login, logout } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [enrolledCodes, setEnrolledCodes] = useState<Set<string>>(new Set())
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [pendingUnenrol, setPendingUnenrol] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name)
      setEmail(user.email)
    }
  }, [user])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoadingCourses(true)
    setCoursesError(null)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('No authentication token found')
      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

      const [coursesRes, enrolRes] = await Promise.all([
        fetch(`${baseUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/students/${user.id}/enrolments`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (!coursesRes.ok) throw new Error('Failed to load courses')
      if (!enrolRes.ok) throw new Error('Failed to load enrolments')
      const courses: Course[] = await coursesRes.json()
      // Backend returns list[CourseOut] for enrolments
      const enrolledCourses: Course[] = await enrolRes.json()
      setAllCourses(courses)
      setEnrolledCodes(new Set(enrolledCourses.map((e) => e.code)))
    } catch (err) {
      console.error('Error loading settings data:', err)
      setCoursesError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoadingCourses(false)
    }
  }, [user])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      setSaving(true)
      setSaveError(null)
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('No authentication token found')
      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      const resp = await fetch(`${baseUrl}/students/${user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, display_name: displayName }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error((data as { detail?: string }).detail ?? 'Failed to update profile')
      }
      const updated = await resp.json()
      const existingToken = token
      // refresh auth context with updated user using existing token
      login(existingToken, updated)
    } catch (err) {
      console.error('Save profile error:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnrolment = async (code: string, nextChecked: boolean) => {
    if (!user) return
    try {
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('No authentication token found')
      const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
      if (nextChecked) {
        const r = await fetch(`${baseUrl}/students/${user.id}/enrolments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ course_code: code }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { detail?: string }).detail ?? 'Failed to enrol')
        }
        setEnrolledCodes((prev) => new Set(prev).add(code))
        setActionMsg({ type: 'success', text: `Enrolled in ${code}` })
      } else {
        const r = await fetch(`${baseUrl}/students/${user.id}/enrolments/${code}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok && r.status !== 204) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { detail?: string }).detail ?? 'Failed to unenrol')
        }
        setEnrolledCodes((prev) => {
          const next = new Set(prev)
          next.delete(code)
          return next
        })
        setActionMsg({ type: 'success', text: `Unenrolled from ${code}` })
      }
    } catch (err) {
      console.error('Toggle enrolment error:', err)
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Action failed' })
    }
  }

  const sortedCourses = useMemo(() => {
    return [...allCourses].sort((a, b) => a.name.localeCompare(b.name))
  }, [allCourses])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#052334]">
        <header className="flex h-12 items-center gap-2 border-b-1 p-8">
          <SidebarTrigger className="md:hidden -ml-8 mr-2" />
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">
            Settings
          </h1>
        </header>

        <div className="p-4 space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Display name</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-white/10 border-white/10 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/10 border-white/10 text-white" />
                </div>
              </div>
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
              <div className="flex gap-2">
                <Button type="button" onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                <Button type="button" variant="outline" onClick={() => logout()}>Log out</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Enrolled subjects</CardTitle>
              <CardDescription>Toggle courses you’re enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {actionMsg && (
                <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${actionMsg.type === 'success' ? 'border-green-400 bg-green-500/10 text-green-200' : 'border-red-400 bg-red-500/10 text-red-200'}`}>
                  {actionMsg.text}
                </div>
              )}
              {loadingCourses ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className="p-4 border border-white/10 rounded-lg bg-white/5">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-40 mt-2" />
                    </div>
                  ))}
                </div>
              ) : coursesError ? (
                <p className="text-red-400">{coursesError}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedCourses.map((course) => {
                    const checked = enrolledCodes.has(course.code)
                    return (
                      <div key={course.code} className="flex items-start justify-between gap-3 p-4 border border-white/10 rounded-lg bg-white/5">
                        <div>
                          <span className="block text-white font-medium">{course.name}</span>
                          <span className="block text-xs text-gray-400">{course.code}</span>
                          {course.description && <span className="block text-xs text-gray-400 mt-1">{course.description}</span>}
                        </div>
                        {checked ? (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setPendingUnenrol(course.code)}
                          >
                            Unenrol
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void toggleEnrolment(course.code, true)}
                          >
                            Enrol
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
          </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Legal & Support</CardTitle>
              <CardDescription>Learn how we handle your data</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/privacy" className="text-sm font-medium text-orange-400 hover:text-orange-300 underline underline-offset-4">
                View Privacy Policy
              </Link>
            </CardContent>
          </Card>
          {/* Confirmation Modal */}
          {pendingUnenrol && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setPendingUnenrol(null)} />
              <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-gray-900 p-6 text-white shadow-xl">
                <h3 className="text-lg font-semibold mb-2">Confirm unenrolment</h3>
                <p className="text-sm text-gray-300">Are you sure you want to unenrol from <span className="font-mono">{pendingUnenrol}</span>? You can enrol again any time.</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setPendingUnenrol(null)}>Cancel</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const code = pendingUnenrol
                      setPendingUnenrol(null)
                      await toggleEnrolment(code, false)
                    }}
                  >
                    Unenrol
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
