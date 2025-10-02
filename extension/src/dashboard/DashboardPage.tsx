import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { fetchStreak, fetchTodayStats, getUser, logout } from "../api/client"
import BlockedSitesManager from "./BlockedSitesManager"
import { Quote } from "lucide-react"
import { FRONTEND_URL } from "../config"

const QUOTES = [
  "Small steps every day lead to big results.",
  "Consistency beats intensity. Keep going.",
  "Progress, not perfection.",
  "Your future self will thank you for today.",
  "Focus. Ship. Grow.",
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function getDailyQuote() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["daily_quote"], (res) => {
      const today = getTodayKey()
      const entry = res.daily_quote
      if (entry?.date === today && entry?.text) {
        resolve(entry.text)
        return
      }
      const text = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      chrome.storage.local.set({ daily_quote: { text, date: today } }, () => resolve(text))
    })
  })
}

export default function PopupDashboard() {
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 })
  const [completedToday, setCompletedToday] = useState(0)
  const [quote, setQuote] = useState("")
  const [name, setName] = useState("there")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBlockedSites, setShowBlockedSites] = useState(false)

  const DAILY_GOAL = 3
  const progress = useMemo(() => Math.max(0, Math.min(1, completedToday / DAILY_GOAL)), [completedToday])

  useEffect(() => {
    ;(async () => {
      try {
        const [quoteText, user, streakData, todayStats] = await Promise.all([
          getDailyQuote(),
          getUser(),
          fetchStreak(),
          fetchTodayStats(),
        ])
        setQuote(quoteText as string)
        if (user?.display_name) {
          setName(user.display_name.split(" ")[0])
        }
        setStreak({
          current_streak: streakData?.current_streak ?? 0,
          longest_streak: streakData?.longest_streak ?? 0,
        })
        setCompletedToday(todayStats?.completed_questions_today ?? 0)
      } catch (e) {
        console.error(e)
        setError("Unable to load your data right now.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-w-[320px] bg-[#0b1320] p-4">
        <Card className="bg-white/5 border-white/10 shadow-xl backdrop-blur">
          <CardContent className="p-4 space-y-3">
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-white/10" />
            <div className="h-16 w-full animate-pulse rounded-md bg-white/10" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showBlockedSites) {
    return (
      <div className="min-w-[320px] min-h-[560px] bg-[#0b1320] p-4 text-slate-100">
        <Card className="bg-white/5 border-white/10 shadow-xl backdrop-blur rounded-2xl h-full min-h-[520px] flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Blocked sites</h1>
                <p className="text-sm text-slate-300">Tune which sites trigger a focus check.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-slate-100 px-0"
                onClick={() => setShowBlockedSites(false)}
              >
                ← Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pb-6 pt-0">
            <BlockedSitesManager />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-[320px] bg-gradient-to-br from-gray-950 to-[#052334] p-4 text-slate-100">
      <Card className="bg-white/5 border-white/10 shadow-xl backdrop-blur rounded-2xl">
        <CardHeader className="pb-2">
          <h1 className="text-xl font-semibold">Welcome, {name}! 👋</h1>
          <p className="text-sm text-slate-300"></p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary CTA */}
          <Button
            className="w-full font-semibold bg-amber-400 text-black hover:bg-amber-300"
            onClick={() => chrome.tabs.create({ url: FRONTEND_URL })}
          >
            Open Dashboard
          </Button>

          {/* Error */}
          {error && (
            <div role="status" aria-live="polite" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-3">
            {/* Streak */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-300">Daily Streak</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="text-5xl font-bold leading-none">{streak.current_streak}</div>
                  <div className="text-xs text-slate-400">
                    <div>days</div>
                  </div>
              </div>
              <div className="text-xs font-semibold text-slate-400">Longest: {streak.longest_streak}</div>
            </div>

            {/* Today */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-300">Today</div>
              <div className="mt-2 flex items-center gap-3">
                {/* Tiny progress ring */}
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" className="fill-none stroke-white/15" strokeWidth="4" />
                  <path
                    d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32"
                    className="fill-none stroke-emerald-400"
                    strokeLinecap="round"
                    strokeWidth="4"
                    style={{ strokeDasharray: `${Math.round(progress * 100)}, 100` }}
                  />
                </svg>
                <div>
                  <div className="text-sm font-semibold">{completedToday} / {DAILY_GOAL} completed</div>
                  <div className="text-xs text-slate-400">
                    {completedToday === 0 ? "Three quick questions to keep your streak." : "Nice work!"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote */}
          <figure className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-3">
            <figcaption className="flex items-start gap-2">
              <Quote className="mt-0.5 h-4 w-4 text-amber-300 shrink-0" aria-hidden />
              <p className="text-sm font-medium text-amber-100">
                {quote}
              </p>
            </figcaption>
            {/* subtle shine */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </figure>


          {/* Secondary actions */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-center gap-2 border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => setShowBlockedSites(true)}
            >
              Manage blocked sites
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="justify-center text-red-300 hover:text-red-200 sm:justify-self-end"
              onClick={async () => { await logout(); window.location.reload(); }}
            >
              Log out
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
