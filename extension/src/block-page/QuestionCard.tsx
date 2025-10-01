import { useState } from 'react';

interface Question {
  id: string;
  prompt?: string;
  question?: string;
  options: string[];
  correctAnswer: number;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  rolling_accuracy?: number;
  attempts?: number;
  last_seen_at?: number;
}

interface QuestionCardProps {
  question: Question;
  onCorrectAnswer: (answerIndex: number) => void;
}

type FeedbackType = null | 'error' | 'correct' | 'incorrect';

const difficultyLabels: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function accuracyLabel(value: number | undefined): string {
  const pct = Math.round((Number.isFinite(value) ? (value ?? 0) : 0) * 100)
  return `${pct}%`
}

function formatRelative(timestamp: number | undefined, prefix: string, emptyFallback: string): string {
  if (!timestamp) return emptyFallback
  const diffMs = Date.now() - timestamp
  const absDiff = Math.abs(diffMs)
  const minutes = Math.round(absDiff / (60 * 1000))
  if (minutes < 1) return `${prefix}just now`
  if (minutes < 60) return `${prefix}${minutes} min${minutes === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${prefix}${hours} hr${hours === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
  const days = Math.round(hours / 24)
  return `${prefix}${days} day${days === 1 ? '' : 's'} ${diffMs >= 0 ? 'ago' : 'from now'}`
}

function QuestionCard({ question, onCorrectAnswer }: QuestionCardProps) {
  // Track which option the user has selected (null means nothing selected yet)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Track the feedback state: null (no feedback), 'correct', or 'incorrect'
  const [feedback, setFeedback] = useState<FeedbackType>(null);

  // Disable the submit button while we're showing feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle when the user clicks on an option button
  const handleOptionClick = (index: number) => {
    // Don't allow changing answers while feedback is showing
    if (isSubmitting) return;
    setSelectedIndex(index);
  };

  // Handle the submit button click
  const handleSubmit = () => {
    // Validate that an option was selected
    if (selectedIndex === null) {
      setFeedback('error');
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setIsSubmitting(true);

    // Check if the selected answer is correct
    if (selectedIndex === question.correctAnswer) {
      setFeedback('correct');
      // Wait a moment to show success, then notify parent component
      setTimeout(() => {
        onCorrectAnswer(selectedIndex);
      }, 1500);
    } else {
      setFeedback('incorrect');
      // Reset after showing the incorrect feedback
      setTimeout(() => {
        setSelectedIndex(null);
        setFeedback(null);
        setIsSubmitting(false);
      }, 2000);
    }
  };

  // Determine the CSS class for each option based on its state
  const getOptionClass = (index: number) => {
    let baseClass = 'w-full text-left border border-white/10 bg-white/5 rounded-lg px-4 py-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ';

    if (!feedback) {
      if (selectedIndex === index) {
        baseClass += 'border-orange-400 bg-orange-400/10 ';
      } else {
        baseClass += '';
      }
    }

    if (feedback === 'correct') {
      if (selectedIndex === index) {
        baseClass += 'border-green-400 bg-green-500/10 text-green-200 ';
      } else {
        baseClass += '';
      }
    }

    if (feedback === 'incorrect') {
      if (selectedIndex === index) {
        baseClass += 'border-red-400 bg-red-500/10 text-red-200 ';
      } else if (index === question.correctAnswer) {
        baseClass += 'border-green-400 bg-green-500/10 text-green-200 ';
      } else {
        baseClass += '';
      }
    }

    if (isSubmitting) {
      baseClass += 'cursor-not-allowed opacity-70';
    } else {
      baseClass += 'cursor-pointer';
    }

    return baseClass;
  };

  const getIndicatorClass = (index: number) => {
    if (feedback === 'correct' && selectedIndex === index) {
      return 'border-emerald-400 bg-emerald-400';
    }

    if (feedback === 'incorrect') {
      if (selectedIndex === index) {
        return 'border-rose-400 bg-rose-400';
      }
      if (index === question.correctAnswer) {
        return 'border-emerald-400 bg-emerald-400';
      }
    }

    if (selectedIndex === index) {
      return 'border-orange-400 bg-orange-400';
    }

    return 'border-slate-300 bg-white/80';
  };

  return (
    <div className="bg-white/5 border-white/10 rounded-3xl border shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)] p-6 md:p-8 text-white">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {question.topic && (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                {question.topic}
              </span>
            )}
            {question.difficulty && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                Difficulty: {difficultyLabels[question.difficulty] || '—'}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
              Accuracy: {accuracyLabel(question.rolling_accuracy)}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
              Attempts: {question.attempts ?? 0}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
              {formatRelative(question.last_seen_at, 'Seen ', 'Not attempted yet')}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold leading-snug text-white">
            {question.prompt || question.question}
          </h2>
          <p className="text-sm text-gray-400">Choose the best answer to continue.</p>
        </div>

        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={getOptionClass(index)}
              onClick={() => handleOptionClick(index)}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${getIndicatorClass(index)}`}
                >
                  {selectedIndex === index && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-sm md:text-base text-gray-200 leading-relaxed">{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Show feedback messages based on the current state */}
        {feedback === 'error' && (
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
            Please select an answer before submitting.
          </div>
        )}

        {feedback === 'correct' && (
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
            <span className="font-semibold text-white">Nice work! That’s correct.</span> Redirecting you now…
          </div>
        )}

        {feedback === 'incorrect' && (
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
            <span className="font-semibold text-white">Not quite.</span> Try the next question.
          </div>
        )}

        <button
          className="w-full bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 hover:from-yellow-400 hover:via-orange-500 hover:to-orange-600 text-slate-900 font-semibold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Checking...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}

export default QuestionCard;
