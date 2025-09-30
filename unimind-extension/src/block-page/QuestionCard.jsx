import { useState } from 'react';

function QuestionCard({ question, onCorrectAnswer }) {
  // Track which option the user has selected (null means nothing selected yet)
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Track the feedback state: null (no feedback), 'correct', or 'incorrect'
  const [feedback, setFeedback] = useState(null);

  // Disable the submit button while we're showing feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle when the user clicks on an option button
  const handleOptionClick = (index) => {
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
        onCorrectAnswer();
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
  const getOptionClass = (index) => {
    let baseClass = 'w-full px-6 py-4 text-left rounded-2xl border transition-all duration-200 backdrop-blur-sm ';

    if (!feedback) {
      if (selectedIndex === index) {
        baseClass += 'bg-orange-50/80 border-orange-300 text-slate-900 shadow-sm ';
      } else {
        baseClass += 'bg-white/70 border-white/40 text-slate-700 hover:bg-white/80 hover:border-orange-200 ';
      }
    }

    if (feedback === 'correct') {
      if (selectedIndex === index) {
        baseClass += 'bg-emerald-50/90 border-emerald-300 text-emerald-700 shadow-sm ';
      } else {
        baseClass += 'bg-white/60 border-white/30 text-slate-600 ';
      }
    }

    if (feedback === 'incorrect') {
      if (selectedIndex === index) {
        baseClass += 'bg-rose-50/90 border-rose-300 text-rose-700 shadow-sm ';
      } else if (index === question.correctAnswer) {
        baseClass += 'bg-emerald-50/90 border-emerald-300 text-emerald-700 shadow-sm ';
      } else {
        baseClass += 'bg-white/60 border-white/30 text-slate-600 ';
      }
    }

    if (isSubmitting) {
      baseClass += 'cursor-not-allowed opacity-70';
    } else {
      baseClass += 'cursor-pointer';
    }

    return baseClass;
  };

  const getIndicatorClass = (index) => {
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
    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)] p-10 md:p-12 text-slate-800">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100/80 border border-orange-200/70 rounded-full">
            <span className="text-orange-600 text-sm font-medium">Focus Check</span>
          </div>
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
            {question.question}
          </h2>
        </div>

        <div className="space-y-4">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={getOptionClass(index)}
              onClick={() => handleOptionClick(index)}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${getIndicatorClass(index)}`}
                >
                  {selectedIndex === index && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-lg">{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Show feedback messages based on the current state */}
        {feedback === 'error' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-5 py-4 rounded-xl text-base">
            Please select an answer before submitting.
          </div>
        )}

        {feedback === 'correct' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-5 py-4 rounded-xl text-base">
            ✓ Correct! Redirecting you now...
          </div>
        )}

        {feedback === 'incorrect' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-5 py-4 rounded-xl text-base">
            ✗ Incorrect. Try the next question.
          </div>
        )}

        <button
          className="w-full bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 hover:from-yellow-400 hover:via-orange-500 hover:to-orange-600 text-slate-900 font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
