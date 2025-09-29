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
    let baseClass = 'w-full px-6 py-4 text-left rounded-xl border transition-all duration-200 ';

    // Highlight the selected option
    if (selectedIndex === index && !feedback) {
      baseClass += 'bg-purple-500/10 border-purple-500/50 text-white ';
    } else if (!feedback) {
      baseClass += 'bg-[#0f0f0f] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#151515] ';
    }

    // After submission, show which answer was correct/incorrect
    if (feedback === 'correct' && selectedIndex === index) {
      baseClass += 'bg-green-500/10 border-green-500/50 text-white ';
    } else if (feedback === 'incorrect') {
      if (selectedIndex === index) {
        baseClass += 'bg-red-500/10 border-red-500/50 text-white ';
      } else if (index === question.correctAnswer) {
        baseClass += 'bg-green-500/10 border-green-500/50 text-white ';
      } else {
        baseClass += 'bg-[#0f0f0f] border-gray-800 text-gray-500 ';
      }
    }

    if (isSubmitting) {
      baseClass += 'cursor-not-allowed opacity-70';
    } else {
      baseClass += 'cursor-pointer';
    }

    return baseClass;
  };

  return (
    <div className="bg-[#1a1a1a] rounded-3xl border border-gray-800 shadow-2xl p-12">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-block px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-2">
            <span className="text-yellow-400 text-sm font-medium">Focus Check</span>
          </div>
          <h2 className="text-white text-3xl font-semibold leading-tight">{question.question}</h2>
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
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  selectedIndex === index
                    ? 'border-yellow-500 bg-yellow-500'
                    : 'border-gray-600'
                }`}>
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
          <div className="bg-red-900/20 border border-red-700/50 text-red-300 px-5 py-4 rounded-xl text-base">
            Please select an answer before submitting.
          </div>
        )}

        {feedback === 'correct' && (
          <div className="bg-green-900/20 border border-green-700/50 text-green-300 px-5 py-4 rounded-xl text-base">
            ✓ Correct! Redirecting you now...
          </div>
        )}

        {feedback === 'incorrect' && (
          <div className="bg-red-900/20 border border-red-700/50 text-red-300 px-5 py-4 rounded-xl text-base">
            ✗ Incorrect. Try the next question.
          </div>
        )}

        <button
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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