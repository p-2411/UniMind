import { useEffect, useState } from 'react'
import { fetchStreak, fetchTodayStats, getUser, logout } from '../api/client.js'
import BlockedSitesManager from './BlockedSitesManager.jsx'
import '../styles/popup.css'

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

async function getDailyQuote() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['daily_quote'], (result) => {
      const today = getTodayKey()
      const entry = result.daily_quote

      if (entry && entry.date === today && entry.text) {
        resolve(entry.text)
        return
      }

      const newQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      chrome.storage.local.set({ daily_quote: { text: newQuote, date: today } }, () => {
        resolve(newQuote)
      })
    })
  })
}

export default function DashboardPage() {
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 })
  const [completedToday, setCompletedToday] = useState(0)
  const [quote, setQuote] = useState('')
  const [name, setName] = useState('there')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBlockedSites, setShowBlockedSites] = useState(false)

  useEffect(() => {
    ;(async () => {
      const dailyQuote = await getDailyQuote()
      setQuote(dailyQuote)

      try {
        const user = await getUser()
        if (user?.display_name) {
          setName(user.display_name.split(' ')[0])
        }
        const data = await fetchStreak()
        setStreak({
          current_streak: data.current_streak ?? 0,
          longest_streak: data.longest_streak ?? 0,
        })
        const todayStats = await fetchTodayStats()
        setCompletedToday(todayStats.completed_questions_today ?? 0)
      } catch (err) {
        console.error('Failed to load streak', err)
        setError('Unable to load streak right now.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="popup-root">
        <div className="card">Loading…</div>
      </div>
    )
  }

  if (showBlockedSites) {
    return (
      <div className="popup-root">
        <div className="card">
          <button
            type="button"
            className="back-button"
            onClick={() => setShowBlockedSites(false)}
          >
            ← Back to Dashboard
          </button>
          <BlockedSitesManager />
        </div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      <div className="card">
        <h1 className="title">Hi, {name} 👋</h1>
        <p className="subtitle">Keep your streak alive with a quick review.</p>

        {error ? (
          <div className="alert">{error}</div>
        ) : (
          <div className="streak-grid">
            <div className="streak-tile">
              <div className="count">{streak.current_streak}</div>
              <div className="label">Current streak</div>
            </div>
            <div className="streak-tile">
              <div className="count">{streak.longest_streak}</div>
              <div className="label">Longest streak</div>
            </div>
            <div className="streak-tile">
              <div className="count">{completedToday}</div>
              <div className="label">Completed today</div>
            </div>
          </div>
        )}

        <div className="quote-box">"{quote}"</div>

        <button
          type="button"
          className="settings-button"
          onClick={() => setShowBlockedSites(true)}
        >
          Manage Blocked Sites
        </button>

        <button
          type="button"
          className="logout-button"
          onClick={async () => {
            await logout()
            window.location.reload()
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
