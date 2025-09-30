import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import type { Assessment } from "@/types/database"

export function UpcomingAssessmentsCard({ className }: { className?: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with actual API endpoint when backend is ready
    const fetchAssessments = async () => {
      try {
        setLoading(true)
        // const response = await fetch('/api/assessments?upcoming=true')
        // if (!response.ok) throw new Error('Failed to fetch assessments')
        // const data = await response.json()
        // setAssessments(data)

        // Placeholder: Empty array until backend is ready
        setAssessments([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assessments')
      } finally {
        setLoading(false)
      }
    }

    fetchAssessments()
  }, [])

  const getAssessmentStakeLevel = (weight: number | null): { label: string; colorClass: string } => {
    if (!weight) return { label: 'Assignment', colorClass: 'text-blue-200 bg-blue-900/40' }
    if (weight >= 20) return { label: 'High Stakes', colorClass: 'text-red-200 bg-red-900/40' }
    if (weight >= 10) return { label: 'Quiz', colorClass: 'text-yellow-200 bg-yellow-900/40' }
    return { label: 'Assignment', colorClass: 'text-blue-200 bg-blue-900/40' }
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

        {!loading && !error && assessments.map((assessment) => {
          const stakeLevel = getAssessmentStakeLevel(assessment.weight)

          return (
            <div key={assessment.id} className="p-3 md:p-4 border rounded-lg hover:bg-gray-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{assessment.title}</h3>
                  {assessment.description && (
                    <p className="text-xs text-muted-foreground">{assessment.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-medium ${stakeLevel.colorClass} rounded-full`}>
                    {stakeLevel.label}
                  </span>
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
      </CardContent>
    </Card>
  )
}