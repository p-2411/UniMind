import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"
import { useEffect, useState } from "react"
import { PriorityEngine, type PriorityResult } from "../priority-engine"
import type { Topic } from "@/types/database"

export function PriorityConceptsCard({ className }: { className?: string }) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [priorityResults, setPriorityResults] = useState<PriorityResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with actual API endpoint when backend is ready
    const fetchTopicsAndCalculatePriorities = async () => {
      try {
        setLoading(true)
        // const response = await fetch('/api/topics?user=currentUserId')
        // if (!response.ok) throw new Error('Failed to fetch topics')
        // const fetchedTopics = await response.json()
        // setTopics(fetchedTopics)

        // Placeholder: Empty array until backend is ready
        const fetchedTopics: Topic[] = []
        setTopics(fetchedTopics)

        // Calculate priorities using PriorityEngine
        // TODO: Fetch user performance data and course configuration from backend
        const topicIds = fetchedTopics.map(t => t.id)
        const courseConfig = {
          // Example: 'DP': {targetShare: 1.5, hasUnseen: true}
          // Replace with actual course configuration from backend
        }

        const priorityEngine = new PriorityEngine(topicIds, courseConfig)
        const priorities = priorityEngine.priorityTopics(3)
        setPriorityResults(priorities)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load priority concepts')
      } finally {
        setLoading(false)
      }
    }

    fetchTopicsAndCalculatePriorities()
  }, [])

  const findTopicById = (topicId: string): Topic | undefined => {
    return topics.find(t => t.id === topicId)
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-200 bg-red-900/40'
      case 'medium':
        return 'text-yellow-200 bg-yellow-900/40'
      case 'low':
        return 'text-blue-200 bg-blue-900/40'
      default:
        return 'text-gray-200 bg-gray-900/40'
    }
  }

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

        {!loading && !error && priorityResults.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No priority concepts to display
          </div>
        )}

        {!loading && !error && priorityResults.map((item) => {
          const topic = findTopicById(item.topicId)
          const priorityColor = getPriorityColor(item.priority)

          return (
            <div key={item.topicId} className="p-2 md:p-3 border rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-8 bg-blue-500 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className={`px-1.5 py-0.5 text-xs font-medium ${priorityColor} rounded-full`}>
                      {item.priority}
                    </span>
                    <span className="hidden md:inline text-xs font-medium">·</span>
                    <span className="text-xs font-medium">
                      {topic?.name || 'Unknown Topic'}
                    </span>
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0">
                  <Target className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}