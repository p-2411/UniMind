// Question selection and scheduling utilities adapted from the
// uni-mind browser extension (ported to TypeScript for the app).

export type AlgoQuestion = {
  id: string
  topic: string
  lastSeenAt: number | null
  nextDueAt: number | null
  rollingAccuracy: number
  attempts: number
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

export function chooseNextQuestion<T extends AlgoQuestion>(
  questions: T[],
  now: number = Date.now(),
): T {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('questions must be a non-empty array')
  }

  const DAY_MS = 24 * 60 * 60 * 1000
  const NEARLY_DUE_MS = DAY_MS
  const W_DUE = 3.0
  const W_WEAKNESS = 1.5
  const W_RECENCY = 1.0
  const W_COVERAGE = 1.0
  const EPS_NOISE = 0.1

  const attemptsByTopic: Record<string, number> = {}
  let totalAttempts = 0
  for (const q of questions) {
    const a = Math.max(0, q.attempts ?? 0)
    attemptsByTopic[q.topic] = (attemptsByTopic[q.topic] ?? 0) + a
    totalAttempts += a
  }
  const uniqueTopics = Array.from(new Set(questions.map((q) => q.topic)))
  const targetShare = uniqueTopics.length > 0 ? 1 / uniqueTopics.length : 0
  const observedShare: Record<string, number> = {}
  for (const t of uniqueTopics) {
    observedShare[t] = totalAttempts > 0 ? (attemptsByTopic[t] ?? 0) / totalAttempts : 0
  }

  const isDue = (q: AlgoQuestion) => {
    const dueAt = q.nextDueAt ?? 0
    return now >= dueAt
  }
  const isNearlyDue = (q: AlgoQuestion) => {
    const dueAt = q.nextDueAt ?? 0
    return dueAt - now <= NEARLY_DUE_MS
  }
  const recencyBoost = (q: AlgoQuestion) => {
    const lastSeen = q.lastSeenAt ?? 0
    const days = (now - lastSeen) / DAY_MS
    if (!isFinite(days) || days <= 0) return 0
    return Math.min(1, days / 7)
  }
  const weakness = (q: AlgoQuestion) => 1 - clamp01(q.rollingAccuracy ?? 0.5)
  const coverageDeficit = (q: AlgoQuestion) => Math.max(0, targetShare - (observedShare[q.topic] ?? 0))

  const score = (q: AlgoQuestion) =>
    (isDue(q) ? W_DUE : 0) +
    W_WEAKNESS * weakness(q) +
    W_RECENCY * recencyBoost(q) +
    W_COVERAGE * coverageDeficit(q) +
    Math.random() * EPS_NOISE

  const due = questions.filter(isDue)
  const pool = due.length > 0 ? due : questions.filter(isNearlyDue)
  const candidates = pool.length > 0 ? pool : questions

  let best = candidates[0]
  let bestScore = -Infinity
  for (const q of candidates) {
    const s = score(q)
    if (s > bestScore) {
      best = q
      bestScore = s
    }
  }
  return best
}

export function chooseNextQuestions<T extends AlgoQuestion>(
  questions: T[],
  count: number,
  excludeIds: Set<string> = new Set(),
  now: number = Date.now(),
): T[] {
  const remaining = questions.filter((q) => !excludeIds.has(q.id))
  const picked: T[] = []
  const seen = new Set(excludeIds)
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const next = chooseNextQuestion(remaining, now)
    picked.push(next)
    seen.add(next.id)
    const idx = remaining.findIndex((q) => q.id === next.id)
    if (idx >= 0) remaining.splice(idx, 1)
  }
  return picked
}

export function updateAfterAnswer<T extends AlgoQuestion>(
  q: T,
  wasCorrect: boolean,
  now: number = Date.now(),
): T {
  const DAY_MS = 24 * 60 * 60 * 1000
  const MIN_CORRECT_INTERVAL = DAY_MS
  const MIN_WRONG_INTERVAL = 6 * 60 * 60 * 1000
  const EMA_ALPHA = 0.2

  const prevAcc = clamp01(q.rollingAccuracy ?? 0.5)
  const target = wasCorrect ? 1 : 0
  const nextAcc = EMA_ALPHA * target + (1 - EMA_ALPHA) * prevAcc
  const attempts = Math.max(0, (q.attempts ?? 0)) + 1

  let prevInterval: number
  if (q.lastSeenAt != null && q.nextDueAt != null) {
    prevInterval = Math.max(1, q.nextDueAt - q.lastSeenAt)
  } else {
    prevInterval = DAY_MS
  }

  const nextInterval = wasCorrect
    ? Math.max(MIN_CORRECT_INTERVAL, prevInterval * 2.0)
    : Math.max(MIN_WRONG_INTERVAL, prevInterval * 0.5)

  return {
    ...q,
    rollingAccuracy: clamp01(nextAcc),
    attempts,
    lastSeenAt: now,
    nextDueAt: now + nextInterval,
  }
}

