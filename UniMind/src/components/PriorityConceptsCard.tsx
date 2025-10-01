import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import type { PriorityResult } from "@/priority-engine"

type PriorityTopic = PriorityResult & {
  id: string
  course_code: string
  name: string
  description: string | null
  created_at: string
  priority_score: number
}

export function PriorityConceptsCard({ className }: { className?: string }) {
  const { user } = useAuth()
  const [topics, setTopics] = useState<PriorityTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPriorityTopics = async () => {
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
        const response = await fetch(`${baseUrl}/students/${user.id}/priority-topics?limit=3`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to fetch priority topics')
        }

        const rawTopics: PriorityTopic[] = (await response.json()).map((topic: any) => {
          const score = Number.isFinite(topic.priority_score)
            ? (1 - Number(topic.priority_score) * 0.01).toFixed(2)
            : 0

          return {
            ...topic,
            priority_score: score,
            topic: topic.name,
            breakdown: {
              masteryGap: 0,
              forgettingRisk: 0,
              coverageDeficit: 0,
              assessmentUrgency: 0,
              struggleSpike: 0,
              novelty: 0,
              overpractice: 0,
              score,
              reasons: [],
            },
          }
        })

        setTopics(rawTopics)
      } catch (err) {
        console.error('Error fetching priority topics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load priority concepts')
      } finally {
        setLoading(false)
      }
    }

    fetchPriorityTopics()
  }, [user])

  return (
    <Card className={`${className} `}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Priority Concepts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="p-4 text-center text-muted-foreground">
            Loading priority concepts...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && topics.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No priority concepts to display. Enroll in a course to get started!
          </div>
        )}

        {!loading && !error && topics.slice(0, 3).map((topic) => (
          <div key={topic.id} className="p-2 md:p-3 border rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-8 bg-blue-500 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                  <span className="text-sm font-medium">{topic.name}</span>
                  <span className="hidden md:inline text-xs font-medium">·</span>
                  <span className="text-xs text-muted-foreground">
                    {topic.course_code}
                  </span>
                  <span className="hidden md:inline text-xs font-medium">·</span>
                  <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2 py-0.5 rounded-full">
                    Score {topic.priority_score}
                  </span>
                </div>
                {topic.description && (
                  <p className="text-xs text-muted-foreground mt-1">{topic.description}</p>
                )}
              </div>
              <button className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0">
                <Target className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
