// src/components/PriorityConceptsCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

function scoreBand(score: number) {
  // High priority (80-100) -> Red
  if ((Number(score.toFixed(2)) <= 0.2)) return { label: "High Priority", color: "text-red-400", ring: "stroke-red-500" }
  // Medium priority (40-79) -> Yellow
  if (Number(score.toFixed(2)) <= 0.6) return { label: "Medium Priority", color: "text-yellow-400", ring: "stroke-yellow-400" }
  // Low priority (0-39) -> Green
  return { label: "Low Priority", color: "text-emerald-400", ring: "stroke-emerald-400" }
}

export function PriorityConceptsCard({ className }: { className?: string }) {
  const { user } = useAuth()
  const [topics, setTopics] = useState<PriorityTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAttempts, setTotalAttempts] = useState(0)

  useEffect(() => {
    const fetchPriorityTopics = async () => {
      if (!user?.id) { setLoading(false); return }
      try {
        setLoading(true)
        const token = localStorage.getItem("access_token")
        if (!token) throw new Error("No authentication token found")

        const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000"

        // Fetch total attempts count
        const attemptsRes = await fetch(`${baseUrl}/students/${user.id}/attempts/count`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json()
          setTotalAttempts(attemptsData.count || 0)

          // Only fetch priority topics if user has at least 5 attempts
          if (attemptsData.count < 5) {
            setLoading(false)
            return
          }
        }

        const res = await fetch(`${baseUrl}/students/${user.id}/priority-topics?limit=3`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to fetch priority topics')
        }

        const rawTopics: PriorityTopic[] = (await res.json()).map((topic: any) => {
          // Convert score to 0-100 range
          const rawScore = Number(topic.priority_score)
          const score = Number.isFinite(rawScore)
            ? (1 - rawScore * 0.01)
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load priority concepts")
      } finally {
        setLoading(false)
      }
    }
    fetchPriorityTopics()
  }, [user])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Priority Concepts</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 animate-pulse">
                <div className="h-20 w-20 mx-auto rounded-full bg-white/10 mb-4" />
                <div className="h-4 w-2/3 mx-auto bg-white/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-center text-red-400">{error}</p>}

        {!loading && !error && totalAttempts < 5 && (
          <p className="text-center text-gray-400">
            Complete at least {5 - totalAttempts} more practice {5 - totalAttempts === 1 ? 'attempt' : 'attempts'} to see priority concepts
          </p>
        )}

        {!loading && !error && totalAttempts >= 5 && topics.length === 0 && (
          <p className="text-center text-gray-400">No urgent topics. Keep practicing!</p>
        )}

        {!loading && !error && totalAttempts >= 5 && topics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topics.map((topic) => {
              const band = scoreBand(topic.priority_score)

              return (
                <div
                key={topic.id}
                className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-5 text-center hover:bg-white/10 transition"
                >
                {/* Top section */}
                <div className="flex flex-col items-center">
                  {/* Circular gauge */}
                  <div className="relative w-24 h-24 mb-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48" cy="48" r="44"
                        className="stroke-white/10"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48" cy="48" r="44"
                        className={band.ring}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - topic.priority_score / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${band.color}`}>
                        {topic.priority_score.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Title + meta */}
                  <h3 className="font-medium text-white">{topic.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{topic.course_code}</p>
                  {topic.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{topic.description}</p>
                  )}
                </div>

                {/* Bottom actions — now pinned to bottom */}
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    size="sm"
                    className="bg-yellow-400 text-black hover:bg-yellow-300
                              focus-visible:ring-2 focus-visible:ring-yellow-300
                              font-semibold"
                    onClick={() => {
                      window.location.href = `/review?topic=${encodeURIComponent(topic.name)}`
                    }}
                  >
                    Practice
                  </Button>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
