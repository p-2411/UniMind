import { fetchQuestionsForExtension } from '../api/client.js';

// Cache for questions
let questionCache = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get questions from backend API with caching
 */
async function getQuestionsFromBackend() {
  const now = Date.now();

  // Return cached questions if still valid
  if (questionCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return questionCache;
  }

  try {
    // Fetch fresh questions from backend
    const questions = await fetchQuestionsForExtension();
    questionCache = questions;
    cacheTimestamp = now;
    return questions;
  } catch (error) {
    console.error('Failed to fetch questions from backend:', error);

    // Fallback to dummy questions if backend fails
    return [
      {
        id: "fallback-1",
        topic: "General Knowledge",
        prompt: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correctAnswer: 2,
        last_seen_at: null,
        next_due_at: null,
        rolling_accuracy: 0.5,
        attempts: 0
      }
    ];
  }
}

// question-selector.js

/**
 * Choose the next question to show.
 * Strategy: prefer due (or nearly due) items; weight by low accuracy,
 * time since last seen, and topic coverage deficit; add tiny randomness.
 *
 * @param {Array<{
 *   id: string|number,
 *   topic: string,
 *   last_seen_at?: number|null,
 *   next_due_at?: number|null,
 *   rolling_accuracy?: number,
 *   attempts?: number
 * }>} questions
 * @param {number} [now=Date.now()]
 * @returns {*} the selected question object (reference to the original)
 */
export function chooseNextQuestion(questions, now = Date.now()) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("questions must be a non-empty array");
  }

  // --- Constants / weights (tune as needed) ---
  const DAY_MS = 24 * 60 * 60 * 1000;
  const NEARLY_DUE_MS = DAY_MS; // consider due within next 24h if none strictly due
  const W_DUE            = 3.0;
  const W_WEAKNESS       = 1.5;
  const W_RECENCY        = 1.0;
  const W_COVERAGE       = 1.0;
  const EPS_NOISE        = 0.10; // exploration

  // --- Topic coverage: based on attempts proportion per topic ---
  const attemptsByTopic = Object.create(null);
  let totalAttempts = 0;
  for (const q of questions) {
    const a = Math.max(0, q.attempts ?? 0);
    attemptsByTopic[q.topic] = (attemptsByTopic[q.topic] ?? 0) + a;
    totalAttempts += a;
  }
  const uniqueTopics = [...new Set(questions.map(q => q.topic))];
  const targetShare = 1 / uniqueTopics.length; // equal-share target
  const observedShare = Object.create(null);
  for (const t of uniqueTopics) {
    observedShare[t] = totalAttempts > 0 ? (attemptsByTopic[t] ?? 0) / totalAttempts : 0;
  }

  // --- Helpers ---
  const isDue = (q) => {
    const dueAt = q.next_due_at ?? 0; // treat missing as due now
    return now >= dueAt;
  };

  const isNearlyDue = (q) => {
    const dueAt = q.next_due_at ?? 0;
    return (dueAt - now) <= NEARLY_DUE_MS;
  };

  const recencyBoost = (q) => {
    const lastSeen = q.last_seen_at ?? 0;
    const days = (now - lastSeen) / DAY_MS;
    // Smooth ramp: 0..1 over 0..7 days since last seen
    if (!isFinite(days) || days <= 0) return 0;
    return Math.min(1, days / 7);
  };

  const weakness = (q) => {
    const acc = clamp01(q.rolling_accuracy ?? 0.5);
    return 1 - acc; // lower accuracy => higher priority
  };

  const coverageDeficit = (q) => {
    const obs = observedShare[q.topic] ?? 0;
    return Math.max(0, targetShare - obs); // under-covered topics get a boost
  };

  const score = (q) => {
    const s =
      (isDue(q) ? W_DUE : 0) +
      W_WEAKNESS * weakness(q) +
      W_RECENCY  * recencyBoost(q) +
      W_COVERAGE * coverageDeficit(q) +
      (Math.random() * EPS_NOISE);
    return s;
  };

  // --- Candidate pool: due first, else nearly due ---
  const due = questions.filter(isDue);
  const pool = due.length > 0 ? due : questions.filter(isNearlyDue);

  // Fallback if somehow pool is empty (e.g., all next_due_at far in future)
  const candidates = pool.length > 0 ? pool : questions;

  // Pick highest scoring candidate
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const q of candidates) {
    const s = score(q);
    if (s > bestScore) {
      bestScore = s;
      best = q;
    }
  }
  return best;
}

/**
 * Update a question after an answer.
 * - rolling_accuracy: EMA toward 1 or 0 (alpha=0.2)
 * - attempts: increment
 * - last_seen_at: now
 * - next_due_at: spaced repetition style (double interval on correct, half on wrong)
 *
 * @param {*} q the same object returned from chooseNextQuestion
 * @param {boolean} wasCorrect
 * @param {number} [now=Date.now()]
 */
export function updateAfterAnswer(q, wasCorrect, now = Date.now()) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const MIN_CORRECT_INTERVAL = DAY_MS;      // >= 1 day on correct
  const MIN_WRONG_INTERVAL   = 6 * 60 * 60 * 1000; // >= 6 hours on wrong
  const EMA_ALPHA = 0.2;

  // Rolling accuracy (EMA)
  const prevAcc = clamp01(q.rolling_accuracy ?? 0.5);
  const target  = wasCorrect ? 1 : 0;
  const nextAcc = EMA_ALPHA * target + (1 - EMA_ALPHA) * prevAcc;
  q.rolling_accuracy = clamp01(nextAcc);

  // Attempts
  q.attempts = Math.max(0, (q.attempts ?? 0)) + 1;

  // Spacing interval
  let prevInterval;
  if (q.last_seen_at != null && q.next_due_at != null) {
    prevInterval = Math.max(1, q.next_due_at - q.last_seen_at);
  } else {
    prevInterval = DAY_MS; // default
  }

  const nextInterval = wasCorrect
    ? Math.max(MIN_CORRECT_INTERVAL, prevInterval * 2.0)
    : Math.max(MIN_WRONG_INTERVAL,   prevInterval * 0.5);

  // Recency + scheduling
  q.last_seen_at = now;
  q.next_due_at  = now + nextInterval;
}

/* ---------------------- utility ---------------------- */
function clamp01(x) {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/* ---------------------- Public API ---------------------- */

/**
 * Get the next question to display using the selection algorithm
 * @returns {Promise<Object>} The selected question
 */
export async function getNextQuestion() {
  const questions = await getQuestionsFromBackend();

  if (!questions || questions.length === 0) {
    throw new Error('No questions available');
  }

  // Use the selection algorithm to choose the best question
  const selectedQuestion = chooseNextQuestion(questions);

  return selectedQuestion;
}

/**
 * Legacy function for backward compatibility
 */
export function getRandomQuestion() {
  // This is now async, so we return a promise
  return getNextQuestion();
}
