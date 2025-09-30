import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Flame } from "lucide-react"
import { useEffect, useState } from "react"
import type { DailyStreak } from "@/types/database"

export function DailyStreakCard({ className }: { className?: string }) {
  const [streak, setStreak] = useState<DailyStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with actual API endpoint when backend is ready
    const fetchStreak = async () => {
      try {
        setLoading(true)
        // const response = await fetch('/api/streak/current')
        // if (!response.ok) throw new Error('Failed to fetch streak')
        // const data = await response.json()
        // setStreak(data)

        // Placeholder: null until backend is ready
        setStreak(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load streak')
      } finally {
        setLoading(false)
      }
    }

    fetchStreak()
  }, [])

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Daily Streak</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        {loading && (
          <div className="text-center text-muted-foreground">
            Loading streak...
          </div>
        )}

        {error && (
          <div className="text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{streak?.current_streak ?? 0}</div>
              <p className="text-sm text-muted-foreground">days</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}