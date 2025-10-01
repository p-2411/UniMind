import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

interface Assessment {
  id: string
  course_code: string
  title: string
  description: string | null
  due_at: string | null
  weight: number | null
  created_at: string
}

export function UpcomingAssessmentsCard({ className }: { className?: string }) {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchAssessments = async () => {
      if (!user || !user.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const token = localStorage.getItem("access_token")

        if (!token) {
          throw new Error('No authentication token found')
        }

        const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
        const response = await fetch(`${baseUrl}/students/${user.id}/upcoming-assessments?limit=3`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to fetch assessments')
        }

        const data: Assessment[] = await response.json()

        const now = Date.now()
        const upcoming = data
          .filter((assessment) => {
            if (!assessment.due_at) return false
            const dueTime = new Date(assessment.due_at).getTime()
            if (Number.isNaN(dueTime)) return false
            return dueTime > now
          })
          .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime())

        setAssessments(upcoming)
        setShowAll(false)
      } catch (err) {
        console.error('Error fetching assessments:', err)
        setError(err instanceof Error ? err.message : 'Failed to load assessments')
      } finally {
        setLoading(false)
      }
    }

    fetchAssessments()
  }, [user])

  const getAssessmentType = (title: string): { label: string; colorClass: string } | null => {
    const t = title.trim().toLowerCase()
    if (t.startsWith('lab')) return { label: 'Lab', colorClass: 'text-blue-200 bg-blue-900/40' }
    if (t.startsWith('assignment')) return { label: 'Assignment', colorClass: 'text-yellow-200 bg-yellow-900/40' }
    return null
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Upcoming Assessments</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="p-4 text-center text-muted-foreground">
            Loading assessments...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && assessments.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No upcoming assessments
          </div>
        )}

        {!loading && !error && assessments.slice(0, showAll ? assessments.length : 3).map((assessment) => {
          const type = getAssessmentType(assessment.title)

          return (
            <div key={assessment.id} className="p-3 md:p-4 border rounded-lg hover:bg-gray-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{assessment.title}</h3>
                    {assessment.weight !== null && (
                      <span className="text-xs font-medium text-orange-400">
                        {assessment.weight}%
                      </span>
                    )}
                  </div>
                  {assessment.description && (
                    <p className="text-xs text-muted-foreground">{assessment.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {type && (
                    <span className={`px-2 py-0.5 text-xs font-medium ${type.colorClass} rounded-full`}>
                      {type.label}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(assessment.due_at)}</span>
                  </div>
                  {assessment.due_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(assessment.due_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!loading && !error && assessments.length > 3 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              {showAll ? 'Show less' : `Show all (${assessments.length})`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
