// priority-engine.ts

export type TopicId = string;

export interface TopicConfig {
  /** Optional desired share per topic for coverage balancing (defaults to equal share = 1) */
  targetShare?: number;
  /** Optional flag: true if there are unseen questions in this topic */
  hasUnseen?: boolean;
  /** Optional next assessment date for this topic (ms epoch); used to compute urgency */
  nextAssessmentAt?: number | null;
}

export interface TopicMetrics extends TopicConfig {
  topic: TopicId;

  /** Exponential moving average of correctness (0..1). Default 0.6 for cold start */
  rollingAccuracy: number;

  /** Last time this topic was seen (ms epoch). Undefined if never seen */
  lastSeenAt?: number;

  /** Internal EMA interval (attempts weighting). Defaults to alpha=0.2 in engine config */
  _emaAlpha?: number;
}

export interface PriorityBreakdown {
  masteryGap: number;
  forgettingRisk: number;
  coverageDeficit: number;
  assessmentUrgency: number;
  struggleSpike: number;
  novelty: number;
  overpractice: number;
  score: number;
  reasons: string[];
}

export interface PriorityResult {
  topic: TopicId;
  breakdown: PriorityBreakdown;
}

export interface EngineConfig {
  /** EMA smoothing for rollingAccuracy updates */
  emaAlpha: number;               // default 0.2
  /** “Days” scale for forgetting curve (sigma) */
  forgettingSigmaDays: number;    // default 8
  /** “Days” scale for assessment urgency (tau) */
  urgencyTauDays: number;         // default 14
  /** Recent history length used for coverage balancing */
  coverageWindowK: number;        // default 50
  /** Window (ms) used to compute struggle spike (e.g., last 7 days) */
  struggleWindowMs: number;       // default 7 * 24h
  /** Weights for the score */
  weights: {
    masteryGap: number;       // default 0.35
    forgettingRisk: number;   // default 0.20
    coverageDeficit: number;  // default 0.15
    assessmentUrgency: number;// default 0.20
    struggleSpike: number;    // default 0.10
    novelty: number;          // default 0.05
    overpractice: number;     // default 0.05 (subtracted)
  };
  /** Default accuracy for unseen topics */
  defaultAccuracy: number;        // default 0.6
}

/** Internal event for history */
type AttemptEvent = {
  topic: TopicId;
  correct: boolean;
  at: number; // ms epoch
};

export class PriorityEngine {
  private topics: Map<TopicId, TopicMetrics> = new Map();
  private history: AttemptEvent[] = [];
  private cfg: EngineConfig;

  constructor(
    topicIds: TopicId[],
    perTopicConfig?: Record<TopicId, TopicConfig>,
    cfg?: Partial<EngineConfig>
  ) {
    const defaults: EngineConfig = {
      emaAlpha: 0.2,
      forgettingSigmaDays: 8,
      urgencyTauDays: 14,
      coverageWindowK: 50,
      struggleWindowMs: 7 * 24 * 60 * 60 * 1000,
      weights: {
        masteryGap: 0.35,
        forgettingRisk: 0.20,
        coverageDeficit: 0.15,
        assessmentUrgency: 0.20,
        struggleSpike: 0.10,
        novelty: 0.05,
        overpractice: 0.05,
      },
      defaultAccuracy: 0.6,
    };

    this.cfg = { ...defaults, ...cfg, weights: { ...defaults.weights, ...(cfg?.weights ?? {}) } };

    // initialize topics
    for (const t of topicIds) {
      const c = perTopicConfig?.[t] ?? {};
      this.topics.set(t, {
        topic: t,
        rollingAccuracy: this.cfg.defaultAccuracy,
        lastSeenAt: undefined,
        hasUnseen: c.hasUnseen ?? true,
        targetShare: c.targetShare ?? 1,
        nextAssessmentAt: c.nextAssessmentAt ?? null,
        _emaAlpha: this.cfg.emaAlpha,
      });
    }
  }

  /** Update or set per-topic config (targetShare, hasUnseen, assessment) */
  upsertTopicConfig(topic: TopicId, cfg: TopicConfig) {
    const prev = this.topics.get(topic);
    if (!prev) return;
    this.topics.set(topic, {
      ...prev,
      targetShare: cfg.targetShare ?? prev.targetShare,
      hasUnseen: cfg.hasUnseen ?? prev.hasUnseen,
      nextAssessmentAt: cfg.nextAssessmentAt ?? prev.nextAssessmentAt ?? null,
    });
  }

  /** Record an attempt for a topic; updates rolling accuracy and history */
  recordAttempt(topic: TopicId, correct: boolean, at: number = Date.now()) {
    const m = this.topics.get(topic);
    if (!m) throw new Error(`Unknown topic: ${topic}`);

    // Update EMA of accuracy
    const alpha = m._emaAlpha ?? this.cfg.emaAlpha;
    m.rollingAccuracy = alpha * (correct ? 1 : 0) + (1 - alpha) * (m.rollingAccuracy ?? this.cfg.defaultAccuracy);

    // Update recency
    m.lastSeenAt = at;

    // If a question was seen from this topic, it's no longer "unseen"
    m.hasUnseen = false;

    // Push to bounded history for coverage & struggle windows
    this.history.push({ topic, correct, at });
    if (this.history.length > this.cfg.coverageWindowK) {
      this.history.shift();
    }
  }

  /** Compute the current priority ranking */
  priorityTopics(topN: number = 5, now: number = Date.now()): PriorityResult[] {
    // Coverage stats over the last K attempts
    const coverageCounts: Record<TopicId, number> = {};
    for (const e of this.history) {
      coverageCounts[e.topic] = (coverageCounts[e.topic] ?? 0) + 1;
    }
    const totalInWindow = Math.max(1, this.history.length);
    const observedShare: Record<TopicId, number> = {};
    for (const t of this.topics.keys()) {
      observedShare[t] = (coverageCounts[t] ?? 0) / totalInWindow;
    }

    // Struggle spike over last struggleWindowMs
    const cutoff = now - this.cfg.struggleWindowMs;
    const attempts7d: Record<TopicId, number> = {};
    const incorrects7d: Record<TopicId, number> = {};
    for (const e of this.history) {
      if (e.at >= cutoff) {
        attempts7d[e.topic] = (attempts7d[e.topic] ?? 0) + 1;
        if (!e.correct) incorrects7d[e.topic] = (incorrects7d[e.topic] ?? 0) + 1;
      }
    }

    const results: PriorityResult[] = [];

    for (const [topic, m] of this.topics.entries()) {
      const acc = clamp01(m.rollingAccuracy ?? this.cfg.defaultAccuracy);

      // 1) Mastery gap
      const masteryGap = 1 - acc;

      // 2) Forgetting risk
      const lastSeenDays = m.lastSeenAt ? (now - m.lastSeenAt) / DAY_MS : Number.POSITIVE_INFINITY;
      const forgettingRisk = forgettingCurve(lastSeenDays, this.cfg.forgettingSigmaDays);

      // 3) Coverage deficit
      const target = m.targetShare ?? 1;
      const observed = observedShare[topic] ?? 0;
      const coverageDeficit = Math.max(0, target - observed);

      // 4) Assessment urgency
      const daysUntil = m.nextAssessmentAt ? (m.nextAssessmentAt - now) / DAY_MS : null;
      const assessmentUrgency = daysUntil != null ? urgencyCurve(daysUntil, this.cfg.urgencyTauDays) : 0;

      // 5) Struggle spike (recent incorrect ratio)
      const a7 = attempts7d[topic] ?? 0;
      const i7 = incorrects7d[topic] ?? 0;
      const struggleSpike = a7 > 0 ? i7 / a7 : 0;

      // 6) Novelty
      const novelty = m.hasUnseen ? 1 : 0;

      // 7) Overpractice (penalty)
      const overpractice = Math.max(0, observed - target);

      const w = this.cfg.weights;
      const score =
        w.masteryGap * masteryGap +
        w.forgettingRisk * forgettingRisk +
        w.coverageDeficit * coverageDeficit +
        w.assessmentUrgency * assessmentUrgency +
        w.struggleSpike * struggleSpike +
        w.novelty * novelty -
        w.overpractice * overpractice;

      const reasonPairs: Array<[string, number]> = [
        ['Low accuracy', w.masteryGap * masteryGap],
        ['Not reviewed lately', w.forgettingRisk * forgettingRisk],
        ['Under-covered topic', w.coverageDeficit * coverageDeficit],
        ['Assessment soon', w.assessmentUrgency * assessmentUrgency],
        ['Recent mistakes', w.struggleSpike * struggleSpike],
        ['New material', w.novelty * novelty],
        ['Over-practised (penalized)', -w.overpractice * overpractice],
      ];
      reasonPairs.sort((a, b) => b[1] - a[1]);
      const reasons = reasonPairs.slice(0, 2).map(([label]) => label);

      results.push({
        topic,
        breakdown: {
          masteryGap,
          forgettingRisk,
          coverageDeficit,
          assessmentUrgency,
          struggleSpike,
          novelty,
          overpractice,
          score,
          reasons,
        },
      });
    }

    results.sort((a, b) => b.breakdown.score - a.breakdown.score);
    return results.slice(0, topN);
  }

  /** Helper: set upcoming assessment date for a topic */
  setAssessment(topic: TopicId, when: number | null) {
    const m = this.topics.get(topic);
    if (!m) throw new Error(`Unknown topic: ${topic}`);
    m.nextAssessmentAt = when;
  }

  /** Helper: mark a topic as currently having unseen questions */
  setHasUnseen(topic: TopicId, hasUnseen: boolean) {
    const m = this.topics.get(topic);
    if (!m) throw new Error(`Unknown topic: ${topic}`);
    m.hasUnseen = hasUnseen;
  }

  /** Expose raw metrics (for debugging/telemetry) */
  getTopicMetrics(topic: TopicId): TopicMetrics | undefined {
    return this.topics.get(topic);
  }

  /** Overwrite rolling accuracy (e.g., migration) */
  setRollingAccuracy(topic: TopicId, accuracy: number) {
    const m = this.topics.get(topic);
    if (!m) throw new Error(`Unknown topic: ${topic}`);
    m.rollingAccuracy = clamp01(accuracy);
  }
}

/* ---------------------- utilities ---------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** 1 - exp(-days / sigma) */
function forgettingCurve(daysSinceLast: number, sigmaDays: number): number {
  if (!isFinite(daysSinceLast)) return 1; // never seen ⇒ high risk
  return 1 - Math.exp(-Math.max(0, daysSinceLast) / Math.max(1e-6, sigmaDays));
}

/** exp(-d / tau), where d can be negative (past due ⇒ still returns >1? clamp) */
function urgencyCurve(daysUntil: number, tauDays: number): number {
  if (daysUntil == null) return 0;
  // For past-due assessments, treat as immediate (cap at daysUntil=0)
  const d = Math.max(0, daysUntil);
  return Math.exp(-d / Math.max(1e-6, tauDays));
}
