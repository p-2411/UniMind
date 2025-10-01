import { useState } from "react";

interface Question {
  id: string;
  prompt?: string;
  question?: string;
  options: string[];
  correctAnswer: number;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  rolling_accuracy?: number;
  attempts?: number;
  last_seen_at?: number;
}

interface QuestionCardProps {
  question: Question;
  onCorrectAnswer: (answerIndex: number) => void;
}

type FeedbackType = null | "error" | "correct" | "incorrect";

const difficultyLabels: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};


function QuestionCard({ question, onCorrectAnswer }: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionClick = (index: number) => {
    if (isSubmitting) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) {
      setFeedback("error");
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setIsSubmitting(true);

    if (selectedIndex === question.correctAnswer) {
      setFeedback("correct");
      setTimeout(() => {
        onCorrectAnswer(selectedIndex);
      }, 1500);
    } else {
      setFeedback("incorrect");
      setTimeout(() => {
        setSelectedIndex(null);
        setFeedback(null);
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const getOptionClass = (index: number) => {
    let baseClass =
      "group w-full text-left border border-white/10 bg-white/5 rounded-xl px-4 py-3 transition-all " +
      "hover:bg-white/10 hover:border-white/20 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " +
      "active:scale-[0.99] shadow-sm ";

    if (!feedback && selectedIndex === index) {
      baseClass += "ring-1 ring-amber-300/40 shadow-[0_0_0_6px_rgba(251,191,36,0.08)] ";
    }

    if (feedback === "correct") {
      if (selectedIndex === index) baseClass += "border-green-400 bg-green-500/10 text-green-200 ";
    }

    if (feedback === "incorrect") {
      if (selectedIndex === index) baseClass += "border-red-400 bg-red-500/10 text-red-200 ";
      else if (index === question.correctAnswer) baseClass += "border-green-400 bg-green-500/10 text-green-200 ";
    }

    baseClass += isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer";
    return baseClass;
  };

  const getIndicatorClass = (index: number) => {
    if (feedback === "correct" && selectedIndex === index) return "border-emerald-400 bg-emerald-400";
    if (feedback === "incorrect") {
      if (selectedIndex === index) return "border-rose-400 bg-rose-400";
      if (index === question.correctAnswer) return "border-emerald-400 bg-emerald-400";
    }
    if (selectedIndex === index) return "border-orange-400 bg-orange-400";
    return "border-slate-300 bg-white/80";
  };

  return (
    // Gradient ring wrapper + inner card
    <div className="relative rounded-[22px] p-[1px] bg-gradient-to-br from-red/15 via-white/5 to-white/15">
      <div className="rounded-[21px] bg-white/5 border border-white/10 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] p-6 md:p-8 text-white">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
              {question.topic && (
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10/50 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200 backdrop-blur-sm">
                  {question.topic}
                </span>
              )}
              {question.difficulty && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                  Difficulty: {difficultyLabels[question.difficulty] || "—"}
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-semibold leading-snug text-white">
              {question.prompt || question.question}
            </h2>
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
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${getIndicatorClass(
                      index
                    )} ${selectedIndex === index && !feedback ? "shadow-[0_0_0_6px_rgba(251,191,36,0.10)]" : ""}`}
                  >
                    {selectedIndex === index && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm md:text-base text-gray-200 leading-relaxed">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {feedback === "error" && (
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
              Please select an answer before submitting.
            </div>
          )}
          {feedback === "correct" && (
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
              <span className="font-semibold text-white">Nice work! That’s correct.</span> Redirecting you now…
            </div>
          )}
          {feedback === "incorrect" && (
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
              <span className="font-semibold text-white">Not quite.</span> Try the next question.
            </div>
          )}

          <button
            className="relative overflow-hidden w-full bg-yellow-400 
                       hover:bg-yellow-300
                       text-slate-900 font-semibold text-base md:text-lg px-6 md:px-8 py-3 md:py-4
                       rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                       shadow-lg hover:shadow-xl focus-visible:ring-2 focus-visible:ring-amber-300"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <span className="relative z-10">{isSubmitting ? "Checking..." : "Submit Answer"}</span>
            <span
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 translate-x-[-100%]
                         bg-gradient-to-r from-white/20 via-white/60 to-white/10 blur-sm
                         transition-transform duration-700 hover:translate-x-[400%] motion-reduce:hidden"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestionCard;
