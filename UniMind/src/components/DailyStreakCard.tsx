import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Flame } from "lucide-react"
import { useEffect, useState } from "react"
import type { DailyStreak } from "@/types/database"

const QUOTES = [
  'Small steps every day lead to big results.',
  'Consistency beats intensity. Keep going.',
  'Progress, not perfection.',
  'Your future self will thank you for today.',
  'Focus. Ship. Grow.',
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getDailyQuote(): string {
  const today = getTodayKey()
  const stored = localStorage.getItem('daily_quote')

  if (stored) {
    try {
      const entry = JSON.parse(stored) as { date: string; text: string }
      if (entry.date === today && entry.text) {
        return entry.text
      }
    } catch {
      // Invalid stored data, will generate new quote
    }
  }

  const newQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  localStorage.setItem('daily_quote', JSON.stringify({ text: newQuote, date: today }))
  return newQuote
}

export function DailyStreakCard({ className }: { className?: string }) {
  const [streak, setStreak] = useState<DailyStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<string>('')

  useEffect(() => {
    // Set daily quote
    setQuote(getDailyQuote())

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
      <CardContent className="flex flex-col items-center gap-4 py-8">
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
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500">
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">{streak?.current_streak ?? 0}</div>
                <p className="text-sm text-muted-foreground">days</p>
              </div>
            </div>

            {quote && (
              <div className="w-full mt-2 px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-center text-muted-foreground italic">
                  "{quote}"
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}